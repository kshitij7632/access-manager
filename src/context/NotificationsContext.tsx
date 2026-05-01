import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

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
  push: (n: Omit<Notification, "id" | "at" | "read">) => void;
  markAllRead: (userId?: string) => void;
  clear: () => void;
};

const KEY = "scorebuzz.notifications";
const MAX = 200;

const NotificationsContext = createContext<NotifValue | null>(null);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setNotifications(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: Notification[]) => {
    setNotifications(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const push: NotifValue["push"] = useCallback((n) => {
    setNotifications(prev => {
      const next = [
        { ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), read: false },
        ...prev,
      ].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isVisible = (n: Notification, userId?: string) =>
    n.audience === "all" || (!!userId && typeof n.audience === "object" && n.audience.userId === userId);

  const visibleFor = (userId?: string) => notifications.filter(n => isVisible(n, userId));

  const unreadCount: NotifValue["unreadCount"] = (userId) => visibleFor(userId).filter(n => !n.read).length;
  const forUser: NotifValue["forUser"] = (userId) => visibleFor(userId);

  const markAllRead: NotifValue["markAllRead"] = (userId) => {
    persist(notifications.map(n => (isVisible(n, userId) ? { ...n, read: true } : n)));
  };

  const clear = () => persist([]);

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
