import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: get calling user's highest-priority role from DB
async function getCallerRole(adminClient: ReturnType<typeof createClient>, callerId: string) {
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("staff")) return "staff";
  return "student";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin client — has service-role access
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerRole = await getCallerRole(adminClient, caller.id);

    // AuthContext sends a flat body: { action, ...payload }
    const body = await req.json();
    const { action, ...payload } = body;

    // ── create ───────────────────────────────────────────────
    if (action === "create") {
      let { name, email, password, role, studentClass, rollNo } = payload;

      // Staff can only create students
      if (callerRole === "staff" && role !== "student") {
        return json({ error: "Staff can only create student accounts" }, 403);
      }
      if (!["super_admin", "staff"].includes(callerRole)) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      // Auto-generate email for students if not explicitly provided or if role is student
      if (role === "student" && (!email || !email.includes("@"))) {
        const parts = name.trim().toLowerCase().split(/\s+/);
        const firstName = parts[0] || "student";
        const lastName = parts.slice(1).join(".") || "user";
        email = `${firstName}.${lastName}@lakshyaprivatetuitions.com`;
      }

      const pass = password || "student123";

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? "Create failed" }, 400);
      }

      const uid = created.user.id;
      const avatar = name.trim().split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);

      // Upsert profile with must_change_password = true
      await adminClient.from("profiles").upsert({
        id: uid,
        name: name.trim(),
        email,
        student_class: studentClass ?? null,
        roll_no: rollNo ?? null,
        avatar,
        must_change_password: true,
      });

      // Insert role
      await adminClient.from("user_roles").delete().eq("user_id", uid);
      await adminClient.from("user_roles").insert({ user_id: uid, role });

      // Audit log
      await adminClient.from("audit_log").insert({
        action: "user.create",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: uid,
        target_label: name.trim(),
        detail: `Role: ${role}`,
      });

      return json({
        user: { id: uid, name: name.trim(), email, role, studentClass, rollNo, mustChangePassword: true },
      });
    }

    // ── reset_password ───────────────────────────────────────
    if (action === "reset_password") {
      const { id } = payload;

      if (callerRole !== "super_admin") {
        return json({ error: "Only super_admin can reset user passwords" }, 403);
      }

      // 1. Fetch target user profile for audit logging & label
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("name, email")
        .eq("id", id)
        .maybeSingle();

      // 2. Set password to student123 in auth.users via Admin API
      const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(id, {
        password: "student123",
      });
      if (updateAuthErr) {
        return json({ error: updateAuthErr.message }, 400);
      }

      // 3. Update profiles.must_change_password = true
      const { error: profileErr } = await adminClient
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", id);
      if (profileErr) {
        return json({ error: profileErr.message }, 400);
      }

      // 4. Create audit log entry
      await adminClient.from("audit_log").insert({
        action: "user.reset_password",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? targetProfile?.email ?? id,
        detail: "Password reset to default (student123)",
      });

      return json({ ok: true });
    }

    // ── delete ───────────────────────────────────────────────
    if (action === "delete") {
      const { id } = payload;

      if (!["super_admin", "staff"].includes(callerRole)) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      // Staff can only delete students
      if (callerRole === "staff") {
        const targetRole = await getCallerRole(adminClient, id);
        if (targetRole !== "student") {
          return json({ error: "Staff can only delete student accounts" }, 403);
        }
      }

      // Fetch target name before deletion for audit
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", id)
        .maybeSingle();

      const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
      if (delErr) {
        return json({ error: delErr.message }, 400);
      }

      // Audit log
      await adminClient.from("audit_log").insert({
        action: "user.delete",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? id,
      });

      return json({ ok: true });
    }

    // ── set_role ─────────────────────────────────────────────
    if (action === "set_role") {
      const { id, role } = payload;

      if (callerRole !== "super_admin") {
        return json({ error: "Only super_admin can change roles" }, 403);
      }

      // Fetch target name for audit
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", id)
        .maybeSingle();

      // Replace all roles for this user
      await adminClient.from("user_roles").delete().eq("user_id", id);
      await adminClient.from("user_roles").insert({ user_id: id, role });

      // Audit log
      await adminClient.from("audit_log").insert({
        action: "user.role_change",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? id,
        detail: `New role: ${role}`,
      });

      return json({ ok: true });
    }

    // ── bulk_create_students ─────────────────────────────────
    if (action === "bulk_create_students") {
      const { rows } = payload; // Array<{ name, email?, password?, studentClass?, rollNo? }>

      if (!["super_admin", "staff"].includes(callerRole)) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      const created: Record<string, unknown>[] = [];
      const errors: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.name) {
          errors.push({ row: i + 2, email: r.email, error: "Missing name" });
          continue;
        }

        let studentEmail = r.email?.trim();
        if (!studentEmail || !studentEmail.includes("@")) {
          const parts = r.name.trim().toLowerCase().split(/\s+/);
          const firstName = parts[0] || "student";
          const lastName = parts.slice(1).join(".") || "user";
          studentEmail = `${firstName}.${lastName}@lakshyaprivatetuitions.com`;
        }

        const pass = r.password?.trim() || "student123";
        const { data: u, error: e } = await adminClient.auth.admin.createUser({
          email: studentEmail,
          password: pass,
          email_confirm: true,
          user_metadata: { name: r.name.trim() },
        });

        if (e || !u.user) {
          errors.push({ row: i + 2, email: studentEmail, error: e?.message ?? "Failed" });
          continue;
        }

        const uid = u.user.id;
        const avatar = r.name.trim().split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);

        await adminClient.from("profiles").upsert({
          id: uid,
          name: r.name.trim(),
          email: studentEmail,
          student_class: r.studentClass ?? null,
          roll_no: r.rollNo ?? null,
          avatar,
          must_change_password: true,
        });

        await adminClient.from("user_roles").delete().eq("user_id", uid);
        await adminClient.from("user_roles").insert({ user_id: uid, role: "student" });

        created.push({ id: uid, name: r.name.trim(), email: studentEmail, role: "student" });
      }

      // Audit log
      if (created.length > 0) {
        await adminClient.from("audit_log").insert({
          action: "user.bulk_import",
          actor_id: caller.id,
          actor_name: caller.user_metadata?.name ?? caller.email,
          actor_role: callerRole,
          detail: `${created.length} created, ${errors.length} errors`,
        });
      }

      return json({ created, errors });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    return json({ error: (err as Error).message }, 500);
  }
});
