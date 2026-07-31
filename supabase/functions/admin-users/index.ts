import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Get calling user's highest-priority role from DB.
 * Returns null if the user has no role — never defaults to "student".
 */
async function getCallerRole(adminClient: ReturnType<typeof createClient>, callerId: string): Promise<string | null> {
  const { data, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
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
      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
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
      console.log(`Generated email: ${email}`);

      let uid = "";
      let isExistingUser = false;
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        user_metadata: { name: name.trim() },
      });

      if (createErr || !created?.user) {
        // Idempotency check: if Auth user / profile already exists, reuse that user id
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
          console.log(`Found existing user id: ${uid}`);
        } else {
          console.error("Auth user creation error:", createErr);
          return json({ error: createErr?.message ?? "Create failed" }, 400);
        }
      } else {
        uid = created.user.id;
        console.log(`Auth user id: ${uid}`);
      }

      // ── STEP 2: Upsert profile ──
      const { data: profileData, error: profileError } = await adminClient.from("profiles").upsert({
        id: uid,
        name: name.trim(),
        email,
        class: studentClass ?? null,
        roll_no: rollNo ?? null,
        must_reset_password: true,
      }).select();

      console.log("Profile insert result:", profileData, "Profile error:", profileError);

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        // ROLLBACK: delete the auth user we just created (only if we created it)
        if (!isExistingUser) {
          const { error: rollbackErr } = await adminClient.auth.admin.deleteUser(uid);
          if (rollbackErr) console.error("Rollback: failed to delete auth user:", rollbackErr);
        }
        return json({ error: `Profile creation failed: ${profileError.message}` }, 400);
      }

      // ── STEP 3: Delete existing role and insert role ──
      const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", uid);
      if (delRoleErr) {
        console.error("Role delete error:", delRoleErr);
        if (!isExistingUser) {
          await adminClient.from("profiles").delete().eq("id", uid);
          await adminClient.auth.admin.deleteUser(uid);
        }
        return json({ error: `Role cleanup failed: ${delRoleErr.message}` }, 400);
      }

      const { data: roleData, error: roleError } = await adminClient.from("user_roles").insert({ user_id: uid, role }).select();

      console.log("Role insert result:", roleData, "Role error:", roleError);

      if (roleError) {
        console.error("Role insert error:", roleError);
        if (!isExistingUser) {
          await adminClient.from("profiles").delete().eq("id", uid);
          await adminClient.auth.admin.deleteUser(uid);
        }
        return json({ error: `Role assignment failed: ${roleError.message}` }, 400);
      }

      // Validation check: ensure profile and user_roles records exist
      if (!profileData || profileData.length === 0 || !roleData || roleData.length === 0) {
        console.error("Validation failed: profile or user_roles missing.");
        if (!isExistingUser) {
          await adminClient.from("user_roles").delete().eq("user_id", uid);
          await adminClient.from("profiles").delete().eq("id", uid);
          await adminClient.auth.admin.deleteUser(uid);
        }
        return json({ error: "Student creation validation failed: database record missing" }, 500);
      }

      // ── STEP 4: Audit log ──
      const { error: auditErr } = await adminClient.from("audit_log").insert({
        action: "user.create",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: uid,
        target_label: name.trim(),
        detail: `Role: ${role}`,
      });
      if (auditErr) {
        console.error("Audit log insert error:", auditErr);
        return json({ error: `User created but audit log failed: ${auditErr.message}` }, 500);
      }

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

      const { data: targetProfile, error: profileLookupErr } = await adminClient
        .from("profiles")
        .select("name, email")
        .eq("id", id)
        .maybeSingle();
      if (profileLookupErr) {
        return json({ error: `Profile lookup failed: ${profileLookupErr.message}` }, 400);
      }

      const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(id, {
        password: "student123",
      });
      if (updateAuthErr) {
        return json({ error: `Password reset failed: ${updateAuthErr.message}` }, 400);
      }

      const { error: profileErr } = await adminClient
        .from("profiles")
        .update({ must_reset_password: true })
        .eq("id", id);
      if (profileErr) {
        return json({ error: `Profile update failed: ${profileErr.message}` }, 400);
      }

      const { error: auditErr } = await adminClient.from("audit_log").insert({
        action: "user.reset_password",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? targetProfile?.email ?? id,
        detail: "Password reset to default (student123)",
      });
      if (auditErr) {
        console.error("Audit log insert error:", auditErr);
        return json({ ok: true, warning: `Password reset but audit log failed: ${auditErr.message}` });
      }

      return json({ ok: true });
    }

    // ── delete ───────────────────────────────────────────────
    if (action === "delete") {
      const { id } = payload;

      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      if (callerRole === "staff") {
        const targetRole = await getCallerRole(adminClient, id);
        if (targetRole !== "student") {
          return json({ error: "Staff can only delete student accounts" }, 403);
        }
      }

      const { data: targetProfile, error: profileLookupErr } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      if (profileLookupErr) {
        console.error("Profile lookup error:", profileLookupErr);
      }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
      if (delErr) {
        return json({ error: `User deletion failed: ${delErr.message}` }, 400);
      }

      const { error: auditErr } = await adminClient.from("audit_log").insert({
        action: "user.delete",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? id,
      });
      if (auditErr) {
        console.error("Audit log insert error:", auditErr);
        return json({ ok: true, warning: `User deleted but audit log failed: ${auditErr.message}` });
      }

      return json({ ok: true });
    }

    // ── set_role ─────────────────────────────────────────────
    if (action === "set_role") {
      const { id, role } = payload;

      if (callerRole !== "super_admin") {
        return json({ error: "Only super_admin can change roles" }, 403);
      }

      const { data: targetProfile, error: profileLookupErr } = await adminClient
        .from("profiles")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      if (profileLookupErr) {
        console.error("Profile lookup error:", profileLookupErr);
      }

      const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", id);
      if (delRoleErr) {
        return json({ error: `Role cleanup failed: ${delRoleErr.message}` }, 400);
      }

      const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: id, role });
      if (roleErr) {
        return json({ error: `Role assignment failed: ${roleErr.message}` }, 400);
      }

      const { error: auditErr } = await adminClient.from("audit_log").insert({
        action: "user.role_change",
        actor_id: caller.id,
        actor_name: caller.user_metadata?.name ?? caller.email,
        actor_role: callerRole,
        target_id: id,
        target_label: targetProfile?.name ?? id,
        detail: `New role: ${role}`,
      });
      if (auditErr) {
        console.error("Audit log insert error:", auditErr);
        return json({ ok: true, warning: `Role changed but audit log failed: ${auditErr.message}` });
      }

      return json({ ok: true });
    }

    // ── bulk_create_students ─────────────────────────────────
    if (action === "bulk_create_students") {
      const { rows } = payload; // Array<{ name, email?, password?, studentClass?, rollNo? }>

      if (!["super_admin", "staff"].includes(callerRole ?? "")) {
        return json({ error: "Insufficient permissions" }, 403);
      }

      const created: Record<string, unknown>[] = [];
      const updated: Record<string, unknown>[] = [];
      const skipped: Record<string, unknown>[] = [];
      const errors: Record<string, unknown>[] = [];

      for (let index = 0; index < rows.length; index++) {
        const r = rows[index];
        const rowNum = index + 2; // +2 because row 1 = header

        if (!r.name || !r.name.trim()) {
          errors.push({ row: rowNum, email: r.email, error: "Missing name" });
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
        console.log(`[Bulk Row ${rowNum}] Generated email: ${studentEmail}`);

        let uid = "";
        let isNewUser = false;

        // STEP 1: Create auth user or reuse existing auth user
        const { data: u, error: e } = await adminClient.auth.admin.createUser({
          email: studentEmail,
          password: pass,
          email_confirm: true,
          user_metadata: { name: r.name.trim() },
        });

        if (e || !u?.user) {
          // Look up existing user via profiles OR auth.users
          let existingId = "";
          const { data: existingProfile } = await adminClient.from("profiles").select("id, name, email, class, roll_no").eq("email", studentEmail).maybeSingle();
          if (existingProfile) {
            existingId = existingProfile.id;

            // Check if profile data is identical — skip if nothing changed
            const newClass = r.studentClass ?? r.class ?? null;
            const newRollNo = r.rollNo ?? null;
            const nameMatch = existingProfile.name === r.name.trim();
            const classMatch = (existingProfile.class ?? null) === newClass;
            const rollMatch = (existingProfile.roll_no ?? null) === newRollNo;

            if (nameMatch && classMatch && rollMatch) {
              skipped.push({ row: rowNum, email: studentEmail });
              console.log(`[Bulk Row ${rowNum}] Skipped (already up to date): ${studentEmail}`);
              continue;
            }
          } else {
            // Search auth.users if profile record is missing
            const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
            const foundAuthUser = userList?.users?.find(usr => usr.email?.toLowerCase() === studentEmail.toLowerCase());
            if (foundAuthUser) existingId = foundAuthUser.id;
          }

          if (existingId) {
            uid = existingId;
            isNewUser = false;
            console.log(`[Bulk Row ${rowNum}] Found existing auth user id: ${uid}`);
          } else {
            console.error(`[Bulk Row ${rowNum}] Auth user creation error:`, e);
            errors.push({ row: rowNum, email: studentEmail, error: e?.message ?? "Auth creation failed" });
            continue;
          }
        } else {
          uid = u.user.id;
          isNewUser = true;
          console.log(`[Bulk Row ${rowNum}] Auth user id: ${uid}`);
        }

        // STEP 2: Upsert profile
        const { data: profileData, error: profileError } = await adminClient.from("profiles").upsert({
          id: uid,
          name: r.name.trim(),
          email: studentEmail,
          class: r.studentClass ?? r.class ?? null,
          roll_no: r.rollNo ?? null,
          must_reset_password: true,
        }).select();

        console.log(`[Bulk Row ${rowNum}] Profile upsert result:`, profileData, "Profile error:", profileError);

        if (profileError) {
          console.error(`[Bulk Row ${rowNum}] Profile upsert error:`, profileError);
          if (isNewUser) {
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: studentEmail, error: `Profile: ${profileError.message}` });
          continue;
        }

        // STEP 3: Ensure user_roles has student role
        const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", uid);
        if (delRoleErr) {
          console.error(`[Bulk Row ${rowNum}] Role delete error:`, delRoleErr);
          if (isNewUser) {
            await adminClient.from("profiles").delete().eq("id", uid);
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: studentEmail, error: `Role cleanup: ${delRoleErr.message}` });
          continue;
        }

        const { data: roleData, error: roleError } = await adminClient.from("user_roles").insert({ user_id: uid, role: "student" }).select();

        console.log(`[Bulk Row ${rowNum}] Role insert result:`, roleData, "Role error:", roleError);

        if (roleError) {
          console.error(`[Bulk Row ${rowNum}] Role insert error:`, roleError);
          if (isNewUser) {
            await adminClient.from("profiles").delete().eq("id", uid);
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: studentEmail, error: `Role: ${roleError.message}` });
          continue;
        }

        // Validation
        if (!uid || !profileData || profileData.length === 0 || !roleData || roleData.length === 0) {
          console.error(`[Bulk Row ${rowNum}] Validation failed: Record missing.`);
          if (isNewUser) {
            await adminClient.from("user_roles").delete().eq("user_id", uid);
            await adminClient.from("profiles").delete().eq("id", uid);
            await adminClient.auth.admin.deleteUser(uid);
          }
          errors.push({ row: rowNum, email: studentEmail, error: "Validation failed: DB record missing" });
          continue;
        }

        const result = { id: uid, name: r.name.trim(), email: studentEmail, role: "student" };
        if (isNewUser) {
          created.push(result);
        } else {
          updated.push(result);
        }
      }

      // Audit log — check error
      if (created.length > 0 || updated.length > 0) {
        const { error: auditErr } = await adminClient.from("audit_log").insert({
          action: "user.bulk_import",
          actor_id: caller.id,
          actor_name: caller.user_metadata?.name ?? caller.email,
          actor_role: callerRole,
          detail: `${created.length} created, ${updated.length} updated, ${skipped.length} skipped, ${errors.length} errors`,
        });
        if (auditErr) {
          console.error("Audit log insert error:", auditErr);
        }
      }

      return json({ created, updated, skipped, errors });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    return json({ error: (err as Error).message }, 500);
  }
});
