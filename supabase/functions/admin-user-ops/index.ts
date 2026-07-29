import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: get calling user's role from DB
async function getCallerRole(adminClient: ReturnType<typeof createClient>, callerId: string) {
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .order("role", { ascending: true })
    .limit(1);
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("staff")) return "staff";
  return "student";
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
      if (!["super_admin", "staff"].includes(callerRole)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return Response.json({ error: createErr?.message ?? "Create failed" }, { status: 400, headers: corsHeaders });
      }

      const uid = created.user.id;
      const avatar = name.trim().split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);

      // Upsert profile
      await adminClient.from("profiles").upsert({
        id: uid,
        name: name.trim(),
        email,
        student_class: studentClass ?? null,
        roll_no: rollNo ?? null,
        avatar,
      });

      // Insert role (delete existing first to avoid duplicates)
      await adminClient.from("user_roles").delete().eq("user_id", uid);
      await adminClient.from("user_roles").insert({ user_id: uid, role });

      return Response.json({
        user: { id: uid, name: name.trim(), email, role, studentClass, rollNo },
      }, { headers: corsHeaders });
    }

    // ── deleteUser ────────────────────────────────────────────
    if (action === "deleteUser") {
      const { userId } = payload;

      if (!["super_admin", "staff"].includes(callerRole)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      // Staff can only delete students
      if (callerRole === "staff") {
        const targetRole = await getCallerRole(adminClient, userId);
        if (targetRole !== "student") {
          return Response.json({ error: "Staff can only delete student accounts" }, { status: 403, headers: corsHeaders });
        }
      }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        return Response.json({ error: delErr.message }, { status: 400, headers: corsHeaders });
      }
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ── updateUserRole ────────────────────────────────────────
    if (action === "updateUserRole") {
      const { userId, role } = payload;

      if (callerRole !== "super_admin") {
        return Response.json({ error: "Only super_admin can change roles" }, { status: 403, headers: corsHeaders });
      }

      // Replace all roles for this user
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("user_roles").insert({ user_id: userId, role });

      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ── bulkCreateStudents ────────────────────────────────────
    if (action === "bulkCreateStudents") {
      const { rows } = payload; // Array<{ name, email, password?, studentClass?, rollNo? }>

      if (!["super_admin", "staff"].includes(callerRole)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      const created: Record<string, unknown>[] = [];
      const errors: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.name || !r.email) {
          errors.push({ row: i + 2, email: r.email, error: "Missing name or email" });
          continue;
        }

        const pass = r.password?.trim() || "student123";
        const { data: u, error: e } = await adminClient.auth.admin.createUser({
          email: r.email.trim(),
          password: pass,
          email_confirm: true,
          user_metadata: { name: r.name.trim() },
        });

        if (e || !u.user) {
          errors.push({ row: i + 2, email: r.email, error: e?.message ?? "Failed" });
          continue;
        }

        const uid = u.user.id;
        const avatar = r.name.trim().split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);

        await adminClient.from("profiles").upsert({
          id: uid,
          name: r.name.trim(),
          email: r.email.trim(),
          student_class: r.studentClass ?? null,
          roll_no: r.rollNo ?? null,
          avatar,
        });

        await adminClient.from("user_roles").delete().eq("user_id", uid);
        await adminClient.from("user_roles").insert({ user_id: uid, role: "student" });

        created.push({ id: uid, name: r.name.trim(), email: r.email.trim(), role: "student" });
      }

      return Response.json({ created, errors }, { headers: corsHeaders });
    }

    // ── listUsers ─────────────────────────────────────────────
    if (action === "listUsers") {
      if (!["super_admin", "staff"].includes(callerRole)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403, headers: corsHeaders });
      }

      // Get profiles with their roles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, name, email, student_class, roll_no, created_at");

      const { data: roleRows } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const roleMap: Record<string, string> = {};
      for (const r of roleRows ?? []) {
        const current = roleMap[r.user_id];
        if (!current || r.role === "super_admin" || (r.role === "staff" && current === "student")) {
          roleMap[r.user_id] = r.role;
        }
      }

      const users = (profiles ?? []).map((p: { id: string, name: string, email: string, student_class: string, roll_no: string, created_at: string }) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: roleMap[p.id] ?? "student",
        studentClass: p.student_class,
        rollNo: p.roll_no,
        createdAt: p.created_at,
      }));

      // Staff only sees students
      const filtered = callerRole === "staff" ? users.filter((u: { role: string }) => u.role === "student") : users;

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
 