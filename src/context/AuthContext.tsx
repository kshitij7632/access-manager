import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Role = "super_admin" | "staff" | "student";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  studentClass?: string;
  rollNo?: string;
  mustChangePassword?: boolean;
};

export type AppUser = AuthUser & { password?: string; createdAt?: string };

type Result = { ok: boolean; error?: string; mustReset?: boolean };

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  users: AppUser[];
  refreshUsers: () => Promise<void>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  adminCreateUser: (input: { name: string; email?: string; password?: string; role: Role; studentClass?: string; rollNo?: string }) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  adminResetPassword: (id: string) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserRole: (id: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (input: { name?: string; email?: string }) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  bulkCreateStudents: (rows: { name: string; email?: string; password?: string; studentClass?: string; rollNo?: string }[]) => Promise<{ created: AuthUser[]; updated: AuthUser[]; skipped: { row: number; email?: string }[]; errors: { row: number; email?: string; error: string }[] }>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Resolve the highest-priority role from a list of role rows.
 * Returns null if the user has NO role assigned — never defaults to "student".
 */
function resolveRole(roleRows: { role: string }[]): Role | null {
  const roles = roleRows.map((r) => r.role as Role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("staff")) return "staff";
  if (roles.includes("student")) return "student";
  return null; // No role assigned — caller must handle this
}

async function loadProfile(userId: string, email: string): Promise<AuthUser> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id, name, email, class, roll_no, must_reset_password").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  if (profilesRes.error) {
    console.error("loadProfile profiles query error:", profilesRes.error);
    throw new Error(`Failed to load profile: ${profilesRes.error.message}`);
  }

  if (rolesRes.error) {
    console.error("loadProfile roles query error:", rolesRes.error);
    throw new Error(`Failed to load user role: ${rolesRes.error.message}`);
  }

  const profile = profilesRes.data;
  const role = resolveRole(rolesRes.data ?? []);

  const p: any = profile ?? {};
  return {
    id: userId,
    email: p.email ?? email,
    name: p.name ?? email.split("@")[0],
    role,
    studentClass: p.class ?? undefined,
    rollNo: p.roll_no ?? undefined,
    mustChangePassword: p.must_reset_password ?? false,
  };
}

async function fetchAllUsers(): Promise<AppUser[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id, name, email, class, roll_no, must_reset_password, created_at"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) {
    console.error("fetchAllUsers profiles query error:", profilesRes.error);
    throw new Error(`Failed to load users: ${profilesRes.error.message}`);
  }

  if (rolesRes.error) {
    console.error("fetchAllUsers roles query error:", rolesRes.error);
    throw new Error(`Failed to load user roles: ${rolesRes.error.message}`);
  }

  const profiles = profilesRes.data ?? [];
  const roles = rolesRes.data ?? [];

  const roleByUser = new Map<string, Role>();
  roles.forEach((r: any) => {
    const cur = roleByUser.get(r.user_id);
    const priority = (x?: Role) => (x === "super_admin" ? 3 : x === "staff" ? 2 : x === "student" ? 1 : 0);
    if (priority(r.role) > priority(cur)) roleByUser.set(r.user_id, r.role);
  });
  return profiles.map((p: any) => ({
    id: p.id,
    name: p.name ?? p.email ?? "User",
    email: p.email ?? "",
    role: roleByUser.get(p.id) ?? null, // No fallback — null means no role assigned
    studentClass: p.class ?? undefined,
    rollNo: p.roll_no ?? undefined,
    mustChangePassword: p.must_reset_password ?? false,
    createdAt: p.created_at ?? undefined,
  }));
}

async function invokeAdmin(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    const msg = (data as any)?.error ?? error.message ?? "Admin request failed";
    return { ok: false as const, error: msg };
  }
  if ((data as any)?.error) return { ok: false as const, error: (data as any).error };
  return { ok: true as const, data };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const invalidateAllCaches = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const refreshUsers = useCallback(async () => {
    try {
      setUsers(await fetchAllUsers());
    } catch (e: any) {
      console.error("fetchAllUsers error:", e);
      toast.error("Failed to load users", { description: e.message || "Database query failed" });
    }
  }, []);

  const hydrate = useCallback(async (session: Session | null) => {
    if (!session?.user) { setUser(null); setUsers([]); setAuthError(null); return; }
    try {
      setAuthError(null);
      const u = await loadProfile(session.user.id, session.user.email ?? "");
      setUser(u);
      void refreshUsers();
    } catch (e: any) {
      console.error("loadProfile failed", e);
      const msg = e.message || "Failed to load user profile";
      setAuthError(msg);
      toast.error("Authentication error", { description: msg });
      // Do NOT create a fake user with role: "student".
      // Set user to null so RequireAuth can show the error.
      setUser(null);
    }
  }, [refreshUsers]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setTimeout(() => { void hydrate(session); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      void hydrate(data.session).finally(() => setLoading(false));
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [hydrate]);

  const login: AuthValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    if (data.session) {
      try {
        const u = await loadProfile(data.session.user.id, data.session.user.email ?? "");
        setUser(u);
        void refreshUsers();
        if (u?.mustChangePassword) {
          return { ok: true, mustReset: true };
        }
      } catch (err: any) {
        console.error("Login loadProfile error:", err);
        return { ok: false, error: err.message || "Failed to load user profile" };
      }
    }
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
    setAuthError(null);
  };

  const updateProfile: AuthValue["updateProfile"] = async ({ name, email }) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    const patch: Record<string, string> = {};
    if (name?.trim()) patch.name = name.trim();
    if (email?.trim()) patch.email = email.trim();
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    if (email && email.trim() !== user.email) {
      const { error: e2 } = await supabase.auth.updateUser({ email: email.trim() });
      if (e2) return { ok: false, error: e2.message };
    }
    setUser({ ...user, ...(patch.name ? { name: patch.name } : {}), ...(patch.email ? { email: patch.email } : {}) });
    return { ok: true };
  };

  const changePassword: AuthValue["changePassword"] = async (_current, next) => {
    if (!next || next.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, error: error.message };

    // Set must_reset_password = false in profiles table
    const { error: pErr } = await supabase.from("profiles").update({ must_reset_password: false }).eq("id", user.id);
    if (pErr) {
      console.error("Error clearing must_reset_password flag:", pErr);
      return { ok: false, error: pErr.message };
    }

    setUser({ ...user, mustChangePassword: false });

    // Invalidate all caches after password change
    await invalidateAllCaches();
    await refreshUsers();

    return { ok: true };
  };

  const adminCreateUser: AuthValue["adminCreateUser"] = async (input) => {
    const res = await invokeAdmin("create", input);
    if (!res.ok) return { ok: false, error: res.error };
    await invalidateAllCaches();
    await refreshUsers();
    const created = (res.data as any)?.user as AuthUser | undefined;
    return { ok: true, user: created };
  };

  const adminResetPassword: AuthValue["adminResetPassword"] = async (id) => {
    const res = await invokeAdmin("reset_password", { id });
    if (!res.ok) return { ok: false, error: res.error };
    await invalidateAllCaches();
    await refreshUsers();
    return { ok: true };
  };

  const deleteUser: AuthValue["deleteUser"] = async (id) => {
    const res = await invokeAdmin("delete", { id });
    if (!res.ok) return { ok: false, error: res.error };
    await invalidateAllCaches();
    await refreshUsers();
    return { ok: true };
  };

  const updateUserRole: AuthValue["updateUserRole"] = async (id, role) => {
    const res = await invokeAdmin("set_role", { id, role });
    if (!res.ok) return { ok: false, error: res.error };
    await invalidateAllCaches();
    await refreshUsers();
    return { ok: true };
  };

  const bulkCreateStudents: AuthValue["bulkCreateStudents"] = async (rows) => {
    const res = await invokeAdmin("bulk_create_students", { rows });
    if (!res.ok) return { created: [], updated: [], skipped: [], errors: [{ row: 0, error: res.error ?? "Failed" }] };
    await invalidateAllCaches();
    await refreshUsers();
    const d = res.data as any;
    return {
      created: d?.created ?? [],
      updated: d?.updated ?? [],
      skipped: d?.skipped ?? [],
      errors: d?.errors ?? [],
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, authError, users,
        refreshUsers,
        login, logout,
        adminCreateUser, adminResetPassword, deleteUser, updateUserRole,
        updateProfile, changePassword, bulkCreateStudents,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
