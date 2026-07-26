import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type Role = "super_admin" | "staff" | "student";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentClass?: string;
  rollNo?: string;
};

export type AppUser = AuthUser & { password?: string; createdAt?: string; mustResetPassword?: boolean };
export type ResetTicket = { email: string; tempPassword: string; issuedAt: string; used: boolean };

type Result = { ok: boolean; error?: string; mustReset?: boolean };

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  users: AppUser[];
  resetTickets: ResetTicket[];
  refreshUsers: () => Promise<void>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  adminCreateUser: (input: { name: string; email: string; password: string; role: Role; studentClass?: string; rollNo?: string }) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserRole: (id: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  resetPasswordWithTemp: (email: string, tempPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (input: { name?: string; email?: string }) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  bulkCreateStudents: (rows: { name: string; email: string; password?: string; studentClass?: string; rollNo?: string }[]) => Promise<{ created: AuthUser[]; errors: { row: number; email?: string; error: string }[] }>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, student_class, roll_no").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const roles = (roleRows ?? []).map((r: any) => r.role as Role);
  const role: Role = roles.includes("super_admin")
    ? "super_admin"
    : roles.includes("staff")
    ? "staff"
    : "student";

  const p: any = profile ?? {};
  return {
    id: userId,
    email: p.email ?? email,
    name: p.name ?? email.split("@")[0],
    role,
    studentClass: p.student_class ?? undefined,
    rollNo: p.roll_no ?? undefined,
  };
}

async function fetchAllUsers(): Promise<AppUser[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, student_class, roll_no, created_at"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roleByUser = new Map<string, Role>();
  (roles ?? []).forEach((r: any) => {
    const cur = roleByUser.get(r.user_id);
    // highest priority wins
    const priority = (x?: Role) => (x === "super_admin" ? 3 : x === "staff" ? 2 : x === "student" ? 1 : 0);
    if (priority(r.role) > priority(cur)) roleByUser.set(r.user_id, r.role);
  });
  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.name ?? p.email ?? "User",
    email: p.email ?? "",
    role: roleByUser.get(p.id) ?? "student",
    studentClass: p.student_class ?? undefined,
    rollNo: p.roll_no ?? undefined,
    createdAt: p.created_at ?? undefined,
  }));
}

async function invokeAdmin(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    // Try to extract server-side error text
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

  const refreshUsers = useCallback(async () => {
    try { setUsers(await fetchAllUsers()); } catch (e) { console.error("fetchAllUsers", e); }
  }, []);

  const hydrate = useCallback(async (session: Session | null) => {
    if (!session?.user) { setUser(null); setUsers([]); return; }
    try {
      const u = await loadProfile(session.user.id, session.user.email ?? "");
      setUser(u);
      // Load user directory in the background — RLS filters what the caller can see
      void refreshUsers();
    } catch (e) {
      console.error("loadProfile failed", e);
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
    if (data.session) await hydrate(data.session);
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
  };

  const requestPasswordReset: AuthValue["requestPasswordReset"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const resetPasswordWithTemp: AuthValue["resetPasswordWithTemp"] = async (_email, _temp, newPassword) => {
    if (!newPassword || newPassword.length < 6) return { ok: false, error: "Password must be 6+ chars" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
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
    if (!next || next.length < 6) return { ok: false, error: "Password must be 6+ chars" };
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const adminCreateUser: AuthValue["adminCreateUser"] = async (input) => {
    const res = await invokeAdmin("create", input);
    if (!res.ok) return { ok: false, error: res.error };
    await refreshUsers();
    const created = (res.data as any)?.user as AuthUser | undefined;
    return { ok: true, user: created };
  };

  const deleteUser: AuthValue["deleteUser"] = async (id) => {
    const res = await invokeAdmin("delete", { id });
    if (!res.ok) return { ok: false, error: res.error };
    await refreshUsers();
    return { ok: true };
  };

  const updateUserRole: AuthValue["updateUserRole"] = async (id, role) => {
    const res = await invokeAdmin("set_role", { id, role });
    if (!res.ok) return { ok: false, error: res.error };
    await refreshUsers();
    return { ok: true };
  };

  const bulkCreateStudents: AuthValue["bulkCreateStudents"] = async (rows) => {
    const res = await invokeAdmin("bulk_create_students", { rows });
    if (!res.ok) return { created: [], errors: [{ row: 0, error: res.error ?? "Failed" }] };
    await refreshUsers();
    const d = res.data as any;
    return { created: d?.created ?? [], errors: d?.errors ?? [] };
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, users, resetTickets: [],
        refreshUsers,
        login, logout,
        adminCreateUser, deleteUser, updateUserRole,
        requestPasswordReset, resetPasswordWithTemp,
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
