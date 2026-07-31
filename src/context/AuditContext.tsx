import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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
  at: string;
};

type AuditValue = {
  entries: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "at">) => void;
  clear: () => void;
};

const AuditContext = createContext<AuditValue | null>(null);

const rowToEntry = (r: any): AuditEntry => ({
  id: r.id,
  action: r.action,
  actorId: r.actor_id ?? undefined,
  actorName: r.actor_name ?? undefined,
  actorRole: r.actor_role ?? undefined,
  targetId: r.target_id ?? undefined,
  targetLabel: r.target_label ?? undefined,
  detail: r.detail ?? undefined,
  at: r.created_at ?? r.at ?? new Date().toISOString(),
});

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const load = useCallback(async () => {
    if (!user) { setEntries([]); return; }
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("audit_log load error:", error);
      toast.error("Failed to load audit log", { description: error.message });
      return;
    }
    setEntries((data ?? []).map(rowToEntry));
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const ch = supabase
      .channel("audit-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const log: AuditValue["log"] = useCallback((entry) => {
    const row = {
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_name: entry.actorName ?? null,
      actor_role: entry.actorRole ?? null,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
      detail: entry.detail ?? null,
    };
    // Fire-and-forget; realtime will refresh the list. But DO surface errors.
    supabase.from("audit_log").insert(row).then(({ error }) => {
      if (error) {
        console.error("audit_log.insert error:", error);
        toast.error("Failed to write audit log", { description: error.message });
      }
    });
  }, []);

  const clear = useCallback(() => setEntries([]), []);

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
