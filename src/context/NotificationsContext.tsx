import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type NotifKind = "exam" | "marks" | "rank" | "system";

export type Notification = {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  at: string;
  read: boolean;
  audience: "all" | { userId: string };
};

type NotifValue = {
  notifications: Notification[];
  unreadCount: (userId?: string) => number;
  forUser: (userId?: string) => Notification[];
  push: (n: Omit<Notification, "id" | "at" | "read">) => Promise<void>;
  markAllRead: (userId?: string) => Promise<void>;
  clear: () => Promise<void>;
};

const NotificationsContext = createContext<NotifValue | null>(null);

const rowToNotif = (r: any): Notification => ({
  id: r.id,
  kind: r.kind as NotifKind,
  title: r.title,
  body: r.body ?? undefined,
  at: r.created_at ?? new Date().toISOString(),
  read: !!r.read_at,
  audience: !r.user_id ? "all" : { userId: r.user_id },
});

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("notifications load error:", error);
      toast.error("Failed to load notifications", { description: error.message });
      return;
    }
    setNotifications((data ?? []).map(rowToNotif));
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const ch = supabase
      .channel("notifications-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const push: NotifValue["push"] = useCallback(async (n) => {
    const row = {
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      user_id: n.audience === "all" ? null : n.audience.userId,
      read_at: null,
    };
    const { error } = await supabase.from("notifications").insert(row);
    if (error) {
      console.error("notifications.insert error:", error);
      toast.error("Failed to send notification", { description: error.message });
    }
  }, []);

  const isVisible = (n: Notification, userId?: string) =>
    n.audience === "all" || (!!userId && typeof n.audience === "object" && n.audience.userId === userId);

  const visibleFor = (userId?: string) => notifications.filter(n => isVisible(n, userId));
  const unreadCount: NotifValue["unreadCount"] = (userId) => visibleFor(userId).filter(n => !n.read).length;
  const forUser: NotifValue["forUser"] = (userId) => visibleFor(userId);

  const markAllRead: NotifValue["markAllRead"] = useCallback(async (userId) => {
    const ids = notifications.filter(n => isVisible(n, userId) && !n.read).map(n => n.id);
    if (ids.length === 0) return;
    setNotifications(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read: true } : n)));
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) {
      console.error("notifications.markAllRead error:", error);
      toast.error("Failed to mark notifications read", { description: error.message });
    }
  }, [notifications]);

  const clear = useCallback(async () => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, forUser, push, markAllRead, clear }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
};
