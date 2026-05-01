import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type AuditAction =
  | "user.create"
  | "user.delete"
  | "user.role_change"
  | "user.bulk_import"
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "exam.create"
  | "marks.upload";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  targetId?: string;
  targetLabel?: string;
  detail?: string;
  at: string; // ISO
};

type AuditValue = {
  entries: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "at">) => void;
  clear: () => void;
};

const KEY = "scorebuzz.audit";
const MAX = 500;

const AuditContext = createContext<AuditValue | null>(null);

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = useCallback((next: AuditEntry[]) => {
    setEntries(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const log: AuditValue["log"] = useCallback((entry) => {
    setEntries(prev => {
      const next = [
        { ...entry, id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  return <AuditContext.Provider value={{ entries, log, clear }}>{children}</AuditContext.Provider>;
};

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("useAudit must be inside AuditProvider");
  return ctx;
};

export const ACTION_LABEL: Record<AuditAction, string> = {
  "user.create": "User created",
  "user.delete": "User deleted",
  "user.role_change": "Role changed",
  "user.bulk_import": "Bulk student import",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.password_reset_request": "Password reset requested",
  "auth.password_reset_complete": "Password reset completed",
  "exam.create": "Exam created",
  "marks.upload": "Marks uploaded",
};
