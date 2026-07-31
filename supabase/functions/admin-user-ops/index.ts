import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Get calling user's role from DB.
 * Returns null if the user has no role — never defaults to "student".
 */
async function getCallerRole(adminClient: ReturnType<typeof createClient>, callerId: string): Promise<string | null> {
  const { data, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .order("role", { ascending: true })
    .limit(1);
  if (error) {
    console.error("getCallerRole query error:", error);
    return null;
  }
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("staff")) return "staff";
  if (roles.includes("student")) return "student";
  return null; // No role assigned
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

    // User client — to verify the caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = await getCallerRole(adminClient, caller.id);

    const { action, payload } = await req.json();

    // ── adminCreateUser ────────────────────────────────────────
    if (action === "adminCreateUser") {
      const { name, email, password, role, studentClass, rollNo } = payload;

      // Staff can only create students
      if (callerRole === "staff" && role !== "student") {
        return Response.json({ error: "Staff can only create student accounts" }, { status: 403, headers: corsHeaders });
      }
      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      let uid = "";
      let isExistingUser = false;
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created?.user) {
        let existingId = "";
        const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("email", email).maybeSingle();
        if (existingProfile) {
          existingId = existingProfile.id;
        } else {
          const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const foundAuthUser = userList?.users?.find(usr => usr.email?.toLowerCase() === email.toLowerCase());
          if (foundAuthUser) existingId = foundAuthUser.id;
        }

        if (existingId) {
          uid = existingId;
          isExistingUser = true;
        } else {
          return Response.json({ error: createErr?.message ?? "Create failed" }, { status: 400, headers: corsHeaders });
        }
      } else {
        uid = created.user.id;
      }

      // Upsert profile — check error
      const { error: profileErr } = await adminClient.from("profiles").upsert({
        id: uid,
        name: name.trim(),
        email,
        class: studentClass ?? null,
        roll_no: rollNo ?? null,
        must_reset_password: true,
      });
      if (profileErr) {
        if (!isExistingUser) {
          await adminClient.auth.admin.deleteUser(uid);
        }
        return Response.json({ error: `Profile creation failed: ${profileErr.message}` }, { status: 400, headers: corsHeaders });
      }

      // Insert role (delete existing first to avoid duplicates) — check errors
      const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", uid);
      if (delRoleErr) {
        if (!isExistingUser) {
          await adminClient.from("profiles").delete().eq("id", uid);
          await adminClient.auth.admin.deleteUser(uid);
        }
        return Response.json({ error: `Role cleanup failed: ${delRoleErr.message}` }, { status: 400, headers: corsHeaders });
      }

      const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: uid, role });
      if (roleErr) {
        if (!isExistingUser) {
          await adminClient.from("profiles").delete().eq("id", uid);
          await adminClient.auth.admin.deleteUser(uid);
        }
        return Response.json({ error: `Role assignment failed: ${roleErr.message}` }, { status: 400, headers: corsHeaders });
      }

      return Response.json({
        user: { id: uid, name: name.trim(), email, role, studentClass, rollNo },
      }, { headers: corsHeaders });
    }

    // ── deleteUser ────────────────────────────────────────────
    if (action === "deleteUser") {
      const { userId } = payload;

      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      if (callerRole === "staff") {
        const targetRole = await getCallerRole(adminClient, userId);
        if (targetRole !== "student") {
          return Response.json({ error: "Staff can only delete student accounts" }, { status: 403, headers: corsHeaders });
        }
      }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        return Response.json({ error: `User deletion failed: ${delErr.message}` }, { status: 400, headers: corsHeaders });
      }
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ── updateUserRole ────────────────────────────────────────
    if (action === "updateUserRole") {
      const { userId, role } = payload;

      if (callerRole !== "super_admin") {
        return Response.json({ error: "Only super_admin can change roles" }, { status: 403, headers: corsHeaders });
      }

      const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (delRoleErr) {
        return Response.json({ error: `Role cleanup failed: ${delRoleErr.message}` }, { status: 400, headers: corsHeaders });
      }

      const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (roleErr) {
        return Response.json({ error: `Role assignment failed: ${roleErr.message}` }, { status: 400, headers: corsHeaders });
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ── bulkCreateStudents ────────────────────────────────────
    if (action === "bulkCreateStudents") {
      const { rows } = payload; // Array<{ name, email, password?, studentClass?, rollNo? }>

      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      const created: Record<string, unknown>[] = [];
      const updated: Record<string, unknown>[] = [];
      const skipped: Record<string, unknown>[] = [];
      const errors: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 2;

        if (!r.name || !r.email) {
          errors.push({ row: rowNum, email: r.email, error: "Missing name or email" });
          continue;
        }

        let uid = "";
        let isNewUser = false;
        const pass = r.password?.trim() || "student123";
        const { data: u, error: e } = await adminClient.auth.admin.createUser({
          email: r.email.trim(),
          password: pass,
          email_confirm: true,
          user_metadata: { name: r.name.trim() },
        });

        if (e || !u?.user) {
          let existingId = "";
          const { data: existingProfile } = await adminClient.from("profiles").select("id, name, email, class, roll_no").eq("email", r.email.trim()).maybeSingle();
          if (existingProfile) {
            existingId = existingProfile.id;

            const newClass = r.studentClass ?? r.class ?? null;
            const newRollNo = r.rollNo ?? null;
            if (existingProfile.name === r.name.trim() &&
                (existingProfile.class ?? null) === newClass &&
                (existingProfile.roll_no ?? null) === newRollNo) {
              skipped.push({ row: rowNum, email: r.email.trim() });
              continue;
            }
          } else {
            const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
            const foundAuthUser = userList?.users?.find(usr => usr.email?.toLowerCase() === r.email.trim().toLowerCase());
            if (foundAuthUser) existingId = foundAuthUser.id;
          }

          if (existingId) {
            uid = existingId;
            isNewUser = false;
          } else {
            errors.push({ row: rowNum, email: r.email, error: e?.message ?? "Auth creation failed" });
            continue;
          }
        } else {
          uid = u.user.id;
          isNewUser = true;
        }

        const { error: profileErr } = await adminClient.from("profiles").upsert({
          id: uid,
          name: r.name.trim(),
          email: r.email.trim(),
          class: r.studentClass ?? r.class ?? null,
          roll_no: r.rollNo ?? null,
          must_reset_password: true,
        });

        if (profileErr) {
          if (isNewUser) await adminClient.auth.admin.deleteUser(uid);
          errors.push({ row: rowNum, email: r.email, error: `Profile: ${profileErr.message}` });
          continue;
        }

        const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", uid);
        if (delRoleErr) {
          if (isNewUser) {
            await adminClient.from("profiles").delete().eq("id", uid);
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: r.email, error: `Role cleanup: ${delRoleErr.message}` });
          continue;
        }

        const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: uid, role: "student" });

        if (roleErr) {
          if (isNewUser) {
            await adminClient.from("profiles").delete().eq("id", uid);
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: r.email, error: `Role: ${roleErr.message}` });
          continue;
        }

        const result = { id: uid, name: r.name.trim(), email: r.email.trim(), role: "student" };
        if (isNewUser) {
          created.push(result);
        } else {
          updated.push(result);
        }
      }

      return Response.json({ created, updated, skipped, errors }, { headers: corsHeaders });
    }

    // ── listUsers ─────────────────────────────────────────────
    if (action === "listUsers") {
      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      const { data: profiles, error: profilesErr } = await adminClient
        .from("profiles")
        .select("id, name, email, class, roll_no, created_at");
      if (profilesErr) {
        return Response.json({ error: `Profiles query failed: ${profilesErr.message}` }, { status: 500, headers: corsHeaders });
      }

      const { data: roleRows, error: rolesErr } = await adminClient
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) {
        return Response.json({ error: `Roles query failed: ${rolesErr.message}` }, { status: 500, headers: corsHeaders });
      }

      const roleMap: Record<string, string> = {};
      for (const r of roleRows ?? []) {
        const current = roleMap[r.user_id];
        if (!current || r.role === "super_admin" || (r.role === "staff" && current === "student")) {
          roleMap[r.user_id] = r.role;
        }
      }

      const users = (profiles ?? []).map((p: { id: string, name: string, email: string, class: string, roll_no: string, created_at: string }) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: roleMap[p.id] ?? null,
        studentClass: p.class,
        rollNo: p.roll_no,
        createdAt: p.created_at,
      }));

      const filtered = callerRole === "staff" ? users.filter((u: { role: string | null }) => u.role === "student") : users;

      return Response.json({ users: filtered }, { headers: corsHeaders });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: corsHeaders });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});