import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Trophy, FileText, Users, GraduationCap, Zap, Upload, LogOut, ShieldCheck, UserCircle, ScrollText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, Role } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/NotificationsBell";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Role[];
};

const baseNav: NavItem[] = [
  { to: "/", label: "Dashboard",   icon: LayoutDashboard, end: true, roles: ["student", "staff", "super_admin"] },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["student", "staff", "super_admin"] },
  { to: "/exams",   label: "Exams",   icon: FileText, roles: ["student", "staff", "super_admin"] },
  { to: "/upload",  label: "Upload Marks", icon: Upload, roles: ["staff", "super_admin"] },
  { to: "/teams",   label: "Teams",   icon: Users, roles: ["student", "staff", "super_admin"] },
  { to: "/teams/builder", label: "Team Builder", icon: Sparkles, roles: ["staff", "super_admin"] },
  { to: "/students",label: "Students",icon: GraduationCap, roles: ["staff", "super_admin"] },
  { to: "/users",   label: "Users",   icon: ShieldCheck, roles: ["staff", "super_admin"] },
  { to: "/audit",   label: "Audit Log", icon: ScrollText, roles: ["super_admin"] },
  { to: "/profile", label: "Profile", icon: UserCircle, roles: ["student", "staff", "super_admin"] },
];

const roleLabel: Record<string, string> = {
  student: "Student",
  staff: "Staff",
  super_admin: "Super Admin",
};

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = baseNav.filter(n => !user || n.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
              <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
            </div>
            <div>
              <div className="font-display text-2xl leading-none text-sidebar-foreground">SCORE<span className="text-accent">BUZZ</span></div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">Live arena</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="m-3 p-4 rounded-xl bg-gradient-card border border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-gradient-gold grid place-items-center text-accent-foreground font-bold shrink-0">
                {user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{user.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-accent">{roleLabel[user.role]}</div>
                <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{user.id}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full mt-3 justify-start text-muted-foreground hover:text-foreground">
              <LogOut className="size-3.5 mr-2" /> Sign out
            </Button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar (all viewports) */}
        <header className="sticky top-0 z-30 px-4 md:px-6 py-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur">
          <div className="md:hidden font-display text-xl">SCORE<span className="text-accent">BUZZ</span></div>
          <div className="hidden md:block text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {user ? `Signed in · ${user.id}` : ""}
          </div>
          <div className="flex items-center gap-1">
            {user && <NotificationsBell />}
            {user && (
              <button onClick={handleLogout} className="md:hidden text-xs text-muted-foreground inline-flex items-center gap-1 ml-2">
                <LogOut className="size-3" /> {user.name.split(" ")[0]}
              </button>
            )}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
