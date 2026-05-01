import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAudit } from "@/context/AuditContext";
import { useNotifications } from "@/context/NotificationsContext";

export type Role = "super_admin" | "staff" | "student";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  password: string; // mock only
  createdAt: string;
  createdBy?: string;
  mustResetPassword?: boolean;
  // Student-only fields
  studentClass?: string;
  rollNo?: string;
};

export type AuthUser = Omit<AppUser, "password">;

export type ResetTicket = {
  email: string;
  tempPassword: string;
  issuedAt: string;
  used: boolean;
};

type AuthValue = {
  user: AuthUser | null;
  users: AppUser[];
  resetTickets: ResetTicket[];
  login: (email: string, password: string) => { ok: boolean; error?: string; mustReset?: boolean };
  logout: () => void;
  registerStudent: (input: { name: string; email: string; password: string }) => { ok: boolean; error?: string; user?: AuthUser };
  adminCreateUser: (input: { name: string; email: string; password: string; role: Role }) => { ok: boolean; error?: string; user?: AuthUser };
  deleteUser: (id: string) => { ok: boolean; error?: string };
  updateUserRole: (id: string, role: Role) => { ok: boolean; error?: string };
  requestPasswordReset: (email: string) => { ok: boolean; error?: string; tempPassword?: string };
  resetPasswordWithTemp: (email: string, tempPassword: string, newPassword: string) => { ok: boolean; error?: string };
  updateProfile: (input: { name?: string; email?: string }) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  bulkCreateStudents: (rows: { name: string; email: string; password?: string }[]) => { created: AuthUser[]; errors: { row: number; email?: string; error: string }[] };
};

const SESSION_KEY = "scorebuzz.session";
const USERS_KEY = "scorebuzz.users";
const RESET_KEY = "scorebuzz.resets";

const seedUsers: AppUser[] = [
  { id: "ADM-2026-001", name: "Root Admin",   email: "admin@scorebuzz.app",   role: "super_admin", password: "admin123",   createdAt: new Date().toISOString() },
  { id: "STA-2026-001", name: "Demo Staff",   email: "staff@scorebuzz.app",   role: "staff",       password: "staff123",   createdAt: new Date().toISOString() },
  { id: "STU-2026-001", name: "Demo Student", email: "student@scorebuzz.app", role: "student",     password: "student123", createdAt: new Date().toISOString() },
];

const rolePrefix = (role: Role) => (role === "super_admin" ? "ADM" : role === "staff" ? "STA" : "STU");

function generateId(role: Role, existing: AppUser[]): string {
  const year = new Date().getFullYear();
  const prefix = `${rolePrefix(role)}-${year}-`;
  const nums = existing
    .filter(u => u.id.startsWith(prefix))
    .map(u => parseInt(u.id.slice(prefix.length), 10))
    .filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const stripPw = (u: AppUser): AuthUser => {
  const { password, ...rest } = u;
  return rest;
};

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [resetTickets, setResetTickets] = useState<ResetTicket[]>([]);
  const { log: auditLog } = useAudit();
  const { push: pushNotif } = useNotifications();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed: AppUser[] = raw ? JSON.parse(raw) : [];
      setUsers(parsed.length ? parsed : seedUsers);
      if (!parsed.length) localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    } catch {
      setUsers(seedUsers);
    }
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      if (s) setUser(JSON.parse(s));
    } catch {}
    try {
      const r = localStorage.getItem(RESET_KEY);
      if (r) setResetTickets(JSON.parse(r));
    } catch {}
  }, []);

  const persistUsers = useCallback((next: AppUser[]) => {
    setUsers(next);
    localStorage.setItem(USERS_KEY, JSON.stringify(next));
  }, []);

  const persistResets = useCallback((next: ResetTicket[]) => {
    setResetTickets(next);
    localStorage.setItem(RESET_KEY, JSON.stringify(next));
  }, []);

  const login: AuthValue["login"] = (email, password) => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: "No account with that email" };
    if (found.password !== password) return { ok: false, error: "Incorrect password" };
    const safe = stripPw(found);
    setUser(safe);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    auditLog({ action: "auth.login", actorId: safe.id, actorName: safe.name, actorRole: safe.role });
    return { ok: true, mustReset: !!found.mustResetPassword };
  };

  const logout = () => {
    if (user) auditLog({ action: "auth.logout", actorId: user.id, actorName: user.name, actorRole: user.role });
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Public signup is STUDENT-only. After registration, the user must sign in manually.
  const registerStudent: AuthValue["registerStudent"] = ({ name, email, password }) => {
    if (!name.trim() || !email.trim() || !password) return { ok: false, error: "All fields are required" };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: "Email already registered" };
    const newUser: AppUser = {
      id: generateId("student", users),
      name: name.trim(),
      email: email.trim(),
      password,
      role: "student",
      createdAt: new Date().toISOString(),
    };
    persistUsers([...users, newUser]);
    // Do NOT auto-login. User must sign in afterward.
    return { ok: true, user: stripPw(newUser) };
  };

  const adminCreateUser: AuthValue["adminCreateUser"] = ({ name, email, password, role }) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    // Staff can only create students
    if (user.role === "staff" && role !== "student") {
      return { ok: false, error: "Staff can only create student accounts" };
    }
    if (user.role === "student") return { ok: false, error: "Students cannot create users" };
    if (!name.trim() || !email.trim() || !password) return { ok: false, error: "All fields are required" };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: "Email already exists" };
    const newUser: AppUser = {
      id: generateId(role, users),
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };
    persistUsers([...users, newUser]);
    auditLog({
      action: "user.create",
      actorId: user.id, actorName: user.name, actorRole: user.role,
      targetId: newUser.id, targetLabel: `${newUser.name} (${role})`,
      detail: newUser.email,
    });
    pushNotif({
      kind: "system",
      title: `Account created: ${newUser.name}`,
      body: `${newUser.id} · ${role}`,
      audience: { userId: newUser.id },
    });
    return { ok: true, user: stripPw(newUser) };
  };

  const deleteUser: AuthValue["deleteUser"] = (id) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    if (id === user.id) return { ok: false, error: "You can't delete your own account" };
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: "User not found" };
    if (user.role === "staff" && target.role !== "student") {
      return { ok: false, error: "Staff can only delete student accounts" };
    }
    if (user.role === "student") return { ok: false, error: "Students cannot delete users" };
    persistUsers(users.filter(u => u.id !== id));
    auditLog({
      action: "user.delete",
      actorId: user.id, actorName: user.name, actorRole: user.role,
      targetId: target.id, targetLabel: `${target.name} (${target.role})`,
      detail: target.email,
    });
    return { ok: true };
  };

  const updateUserRole: AuthValue["updateUserRole"] = (id, role) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    if (user.role !== "super_admin") return { ok: false, error: "Only super admins can change roles" };
    if (id === user.id) return { ok: false, error: "You can't change your own role" };
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: "User not found" };
    persistUsers(users.map(u => (u.id === id ? { ...u, role } : u)));
    auditLog({
      action: "user.role_change",
      actorId: user.id, actorName: user.name, actorRole: user.role,
      targetId: target.id, targetLabel: target.name,
      detail: `${target.role} → ${role}`,
    });
    pushNotif({
      kind: "system",
      title: "Your role was updated",
      body: `Now: ${role}`,
      audience: { userId: target.id },
    });
    return { ok: true };
  };

  const requestPasswordReset: AuthValue["requestPasswordReset"] = (email) => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: "No account with that email" };
    const tempPassword = generateTempPassword();
    // Set the user's password to the temp one and mark must-reset
    persistUsers(users.map(u => (u.id === found.id ? { ...u, password: tempPassword, mustResetPassword: true } : u)));
    const ticket: ResetTicket = {
      email: found.email,
      tempPassword,
      issuedAt: new Date().toISOString(),
      used: false,
    };
    // Keep only latest 20 tickets
    persistResets([ticket, ...resetTickets.filter(t => t.email !== found.email)].slice(0, 20));
    auditLog({ action: "auth.password_reset_request", targetId: found.id, targetLabel: found.name, detail: found.email });
    return { ok: true, tempPassword };
  };

  const resetPasswordWithTemp: AuthValue["resetPasswordWithTemp"] = (email, tempPassword, newPassword) => {
    if (!newPassword || newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: "No account with that email" };
    if (found.password !== tempPassword) return { ok: false, error: "Temporary password is incorrect" };
    persistUsers(users.map(u => (u.id === found.id ? { ...u, password: newPassword, mustResetPassword: false } : u)));
    persistResets(resetTickets.map(t => (t.email.toLowerCase() === email.toLowerCase() ? { ...t, used: true } : t)));
    auditLog({ action: "auth.password_reset_complete", targetId: found.id, targetLabel: found.name, detail: found.email });
    return { ok: true };
  };

  const updateProfile: AuthValue["updateProfile"] = ({ name, email }) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim();
    if (trimmedName !== undefined && !trimmedName) return { ok: false, error: "Name cannot be empty" };
    if (trimmedEmail !== undefined && !trimmedEmail) return { ok: false, error: "Email cannot be empty" };
    if (
      trimmedEmail &&
      users.some(u => u.id !== user.id && u.email.toLowerCase() === trimmedEmail.toLowerCase())
    ) {
      return { ok: false, error: "Email already in use" };
    }
    const next = users.map(u =>
      u.id === user.id
        ? { ...u, ...(trimmedName ? { name: trimmedName } : {}), ...(trimmedEmail ? { email: trimmedEmail } : {}) }
        : u
    );
    persistUsers(next);
    const updated = next.find(u => u.id === user.id)!;
    const safe = stripPw(updated);
    setUser(safe);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return { ok: true };
  };

  const changePassword: AuthValue["changePassword"] = (current, next) => {
    if (!user) return { ok: false, error: "Not authenticated" };
    if (!next || next.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
    if (current === next) return { ok: false, error: "New password must be different" };
    const me = users.find(u => u.id === user.id);
    if (!me) return { ok: false, error: "Account not found" };
    if (me.password !== current) return { ok: false, error: "Current password is incorrect" };
    persistUsers(users.map(u => (u.id === user.id ? { ...u, password: next, mustResetPassword: false } : u)));
    return { ok: true };
  };

  const bulkCreateStudents: AuthValue["bulkCreateStudents"] = (rows) => {
    const errors: { row: number; email?: string; error: string }[] = [];
    const created: AuthUser[] = [];
    if (!user || (user.role !== "staff" && user.role !== "super_admin")) {
      errors.push({ row: 0, error: "Not authorized" });
      return { created, errors };
    }
    let working = [...users];
    rows.forEach((r, i) => {
      const rowNum = i + 1;
      const name = r.name?.trim();
      const email = r.email?.trim();
      const password = (r.password ?? "").trim() || "student123";
      if (!name || !email) {
        errors.push({ row: rowNum, email, error: "Missing name or email" });
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.push({ row: rowNum, email, error: "Invalid email" });
        return;
      }
      if (password.length < 6) {
        errors.push({ row: rowNum, email, error: "Password must be 6+ chars" });
        return;
      }
      if (working.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        errors.push({ row: rowNum, email, error: "Email already exists" });
        return;
      }
      const newUser: AppUser = {
        id: generateId("student", working),
        name,
        email,
        password,
        role: "student",
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        mustResetPassword: true,
      };
      working = [...working, newUser];
      created.push(stripPw(newUser));
    });
    if (created.length) {
      persistUsers(working);
      auditLog({
        action: "user.bulk_import",
        actorId: user.id, actorName: user.name, actorRole: user.role,
        detail: `${created.length} students imported${errors.length ? `, ${errors.length} errors` : ""}`,
      });
    }
    return { created, errors };
  };

  return (
    <AuthContext.Provider
      value={{
        user, users, resetTickets,
        login, logout,
        registerStudent, adminCreateUser, deleteUser, updateUserRole,
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
