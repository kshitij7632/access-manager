import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  FileText,
  Users,
  GraduationCap,
  Zap,
  Upload,
  LogOut,
  ShieldCheck,
  UserCircle,
  ScrollText,
  Sparkles,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, Role } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Role[];
};

const baseNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["student", "staff", "super_admin"] },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["student", "staff", "super_admin"] },
  { to: "/exams", label: "Exams", icon: FileText, roles: ["student", "staff", "super_admin"] },
  { to: "/upload", label: "Upload Marks", icon: Upload, roles: ["staff", "super_admin"] },
  { to: "/teams", label: "Teams", icon: Users, roles: ["student", "staff", "super_admin"] },
  { to: "/teams/builder", label: "Team Builder", icon: Sparkles, roles: ["staff", "super_admin"] },
  { to: "/students", label: "Students", icon: GraduationCap, roles: ["staff", "super_admin"] },
  { to: "/users", label: "Users", icon: ShieldCheck, roles: ["staff", "super_admin"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["super_admin"] },
  { to: "/profile", label: "Profile", icon: UserCircle, roles: ["student", "staff", "super_admin"] },
];

const roleLabel: Record<string, string> = {
  student: "Student",
  staff: "Staff",
  super_admin: "Super Admin",
};

const getRoleLabel = (role: string | null | undefined): string => {
  if (!role) return "No role assigned";
  return roleLabel[role] ?? "Unknown role";
};

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = baseNav.filter((n) => user?.role && n.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userInitials = user
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full bg-background text-foreground overflow-x-hidden">
      {/* Desktop Sidebar (lg breakpoint and up) */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen shrink-0">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold shrink-0">
              <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
            </div>
            <div>
              <div className="font-display text-2xl leading-none text-sidebar-foreground tracking-wide">
                SCORE<span className="text-accent">BUZZ</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1 font-semibold">
                Live arena
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-smooth min-h-[44px]",
                  isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="m-3 p-4 rounded-xl bg-gradient-card border border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-gradient-gold grid place-items-center text-accent-foreground font-bold shrink-0 shadow-gold">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{user.name}</div>
                <div
                  className={`text-[10px] uppercase tracking-widest font-bold ${
                    user.role ? "text-accent" : "text-amber-500"
                  }`}
                >
                  {getRoleLabel(user.role)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full mt-3 justify-start text-muted-foreground hover:text-foreground h-11"
            >
              <LogOut className="size-4 mr-2" /> Sign out
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile Top Bar (sticky top) */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur lg:hidden h-16 shrink-0">
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-accent/15 focus:outline-none"
                aria-label="Open Navigation Drawer"
              >
                <Menu className="size-6 text-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col bg-sidebar border-r border-sidebar-border">
              <SheetHeader className="p-5 border-b border-sidebar-border text-left">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold shrink-0">
                    <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
                  </div>
                  <div>
                    <div className="font-display text-2xl leading-none text-sidebar-foreground">
                      SCORE<span className="text-accent">BUZZ</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1 font-semibold">
                      Study. Compete.
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Drawer Links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {nav.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold transition-smooth min-h-[48px]",
                        isActive
                          ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <Icon className="size-5 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer Footer */}
              {user && (
                <div className="p-4 border-t border-sidebar-border bg-gradient-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center text-accent-foreground font-bold shrink-0 shadow-gold">
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{user.name}</div>
                      <div className="text-xs text-accent font-semibold">{getRoleLabel(user.role)}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full justify-center gap-2 h-12 text-destructive border-destructive/30 hover:bg-destructive/10 font-bold"
                  >
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo Center */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-gold grid place-items-center shadow-gold shrink-0">
              <Zap className="size-4 text-accent-foreground" strokeWidth={3} />
            </div>
            <span className="font-display text-xl leading-none text-foreground tracking-wide">
              SCORE<span className="text-accent">BUZZ</span>
            </span>
          </NavLink>
        </div>

        {/* Right Top Bar items */}
        <div className="flex items-center gap-2">
          {user && <NotificationsBell />}
          {user && (
            <NavLink
              to="/profile"
              className="size-10 rounded-xl bg-gradient-gold grid place-items-center text-accent-foreground font-bold shadow-gold text-xs min-h-[44px] min-w-[44px] shrink-0"
              aria-label="View Profile"
            >
              {userInitials}
            </NavLink>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-30 px-6 py-3 items-center justify-between border-b border-border bg-background/80 backdrop-blur h-16">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {user ? `Signed in as ${user.name} (${getRoleLabel(user.role)})` : ""}
          </div>
          <div className="flex items-center gap-3">
            {user && <NotificationsBell />}
          </div>
        </header>

        {/* Page Content */}
        <div className="w-full max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
