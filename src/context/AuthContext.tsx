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

// kept for compatibility with existing pages
export type AppUser = AuthUser & { password?: string; createdAt?: string; mustResetPassword?: boolean };
export type ResetTicket = { email: string; tempPassword: string; issuedAt: string; used: boolean };

type Result = { ok: boolean; error?: string; mustReset?: boolean };

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  users: AppUser[]; // populated only for staff/admin via Users page later
  resetTickets: ResetTicket[];
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

const ADMIN_TODO = "Admin user management requires the admin edge function (stage 4). Coming soon.";

async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  // Profile + role in parallel
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, student_class, roll_no").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  // Pick the highest-priority role
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (session: Session | null) => {
    if (!session?.user) { setUser(null); return; }
    try {
      const u = await loadProfile(session.user.id, session.user.email ?? "");
      setUser(u);
    } catch (e) {
      console.error("loadProfile failed", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Subscribe FIRST, then check existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      // Defer Supabase calls out of the callback to avoid deadlocks
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
  };

  const requestPasswordReset: AuthValue["requestPasswordReset"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const resetPasswordWithTemp: AuthValue["resetPasswordWithTemp"] = async (_email, _temp, newPassword) => {
    // Supabase recovery: user lands via email link with a session already set.
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

  // Admin ops — stubbed until the edge function ships
  const adminCreateUser: AuthValue["adminCreateUser"] = async () => ({ ok: false, error: ADMIN_TODO });
  const deleteUser: AuthValue["deleteUser"] = async () => ({ ok: false, error: ADMIN_TODO });
  const updateUserRole: AuthValue["updateUserRole"] = async () => ({ ok: false, error: ADMIN_TODO });
  const bulkCreateStudents: AuthValue["bulkCreateStudents"] = async () => ({
    created: [],
    errors: [{ row: 0, error: ADMIN_TODO }],
  });

  return (
    <AuthContext.Provider
      value={{
        user, loading, users: [], resetTickets: [],
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
