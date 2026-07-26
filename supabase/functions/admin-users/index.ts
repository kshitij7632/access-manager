// Admin user management edge function.
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY env vars
// (Supabase provides these automatically for deployed functions).
//
// Deploy:  supabase functions deploy admin-users --no-verify-jwt
// Config for verify_jwt lives in supabase/config.toml (verify_jwt = false),
// we validate the caller's JWT manually below.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Role = "super_admin" | "staff" | "student";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Missing bearer token" }, 401);

  // Identify caller with anon client + user token
  const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userRes, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "Not authenticated" }, 401);
  const caller = userRes.user;

  // Service client — bypasses RLS for admin operations
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // Determine caller role from user_roles
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
  const roles = (roleRows ?? []).map((r) => r.role as Role);
  const callerRole: Role = roles.includes("super_admin") ? "super_admin" : roles.includes("staff") ? "staff" : "student";

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = payload?.action as string;

  const canCreate = (target: Role): boolean => {
    if (callerRole === "super_admin") return true;
    if (callerRole === "staff") return target === "student";
    return false;
  };

  try {
    switch (action) {
      case "create": {
        const { name, email, password, role, studentClass, rollNo } = payload;
        if (!name || !email || !password || !role) return json({ error: "Missing fields" }, 400);
        if (!canCreate(role as Role)) return json({ error: "Not allowed to create this role" }, 403);

        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: String(email).trim(),
          password: String(password),
          email_confirm: true,
          user_metadata: { name },
        });
        if (cErr || !created.user) return json({ error: cErr?.message ?? "Create failed" }, 400);

        const uid = created.user.id;
        const profile = {
          id: uid,
          name,
          email: String(email).trim(),
          student_class: role === "student" ? (studentClass ?? null) : null,
          roll_no: role === "student" ? (rollNo ?? null) : null,
        };
        const { error: pErr } = await admin.from("profiles").upsert(profile);
        if (pErr) return json({ error: `Profile: ${pErr.message}` }, 400);

        const { error: rErr } = await admin.from("user_roles").insert({ user_id: uid, role });
        if (rErr) return json({ error: `Role: ${rErr.message}` }, 400);

        return json({ user: { id: uid, name, email: profile.email, role, studentClass, rollNo } });
      }

      case "delete": {
        if (callerRole !== "super_admin" && callerRole !== "staff") return json({ error: "Forbidden" }, 403);
        const id = payload.id as string;
        if (!id) return json({ error: "Missing id" }, 400);
        if (id === caller.id) return json({ error: "Cannot delete yourself" }, 400);

        // Staff can only delete students
        if (callerRole === "staff") {
          const { data: tr } = await admin.from("user_roles").select("role").eq("user_id", id);
          const targetRoles = (tr ?? []).map((r) => r.role as Role);
          if (!targetRoles.includes("student") || targetRoles.some((r) => r !== "student")) {
            return json({ error: "Staff can only delete students" }, 403);
          }
        }

        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      case "set_role": {
        if (callerRole !== "super_admin") return json({ error: "Forbidden" }, 403);
        const { id, role } = payload;
        if (!id || !role) return json({ error: "Missing fields" }, 400);
        if (id === caller.id) return json({ error: "Cannot change your own role" }, 400);
        await admin.from("user_roles").delete().eq("user_id", id);
        const { error } = await admin.from("user_roles").insert({ user_id: id, role });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      case "bulk_create_students": {
        if (!canCreate("student")) return json({ error: "Forbidden" }, 403);
        const rows = (payload.rows ?? []) as any[];
        const created: any[] = [];
        const errors: { row: number; email?: string; error: string }[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const pwd = r.password || Math.random().toString(36).slice(2, 10);
          try {
            const { data: c, error: cErr } = await admin.auth.admin.createUser({
              email: String(r.email).trim(),
              password: pwd,
              email_confirm: true,
              user_metadata: { name: r.name },
            });
            if (cErr || !c.user) { errors.push({ row: i + 1, email: r.email, error: cErr?.message ?? "Create failed" }); continue; }
            const uid = c.user.id;
            await admin.from("profiles").upsert({
              id: uid, name: r.name, email: String(r.email).trim(),
              student_class: r.studentClass ?? null, roll_no: r.rollNo ?? null,
            });
            await admin.from("user_roles").insert({ user_id: uid, role: "student" });
            created.push({ id: uid, name: r.name, email: r.email, role: "student", studentClass: r.studentClass, rollNo: r.rollNo });
          } catch (e) {
            errors.push({ row: i + 1, email: r.email, error: String((e as Error).message ?? e) });
          }
        }
        return json({ created, errors });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
