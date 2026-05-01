import { Bell, Trophy, FileText, Sparkles, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useNotifications, NotifKind } from "@/context/NotificationsContext";
import { cn } from "@/lib/utils";

const iconFor: Record<NotifKind, typeof Bell> = {
  exam: FileText,
  marks: Sparkles,
  rank: Trophy,
  system: Megaphone,
};

const tintFor: Record<NotifKind, string> = {
  exam: "text-primary",
  marks: "text-accent",
  rank: "text-accent",
  system: "text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const NotificationsBell = () => {
  const { user } = useAuth();
  const { forUser, unreadCount, markAllRead } = useNotifications();
  const items = forUser(user?.id).slice(0, 30);
  const unread = unreadCount(user?.id);

  return (
    <Popover onOpenChange={(open) => { if (!open) markAllRead(user?.id); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 bg-popover">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Inbox</div>
            <div className="font-display text-lg leading-none mt-1">Notifications</div>
          </div>
          {unread > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead(user?.id)}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          )}
          {items.map(n => {
            const Icon = iconFor[n.kind];
            return (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b border-border/60 last:border-b-0 flex gap-3",
                  !n.read && "bg-accent/5"
                )}
              >
                <div className={cn("size-9 rounded-lg bg-secondary grid place-items-center shrink-0", tintFor[n.kind])}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.at)}</div>
                </div>
                {!n.read && <div className="size-2 rounded-full bg-accent mt-2 shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
