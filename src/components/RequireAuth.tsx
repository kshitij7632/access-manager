import { Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "@/context/AuthContext";
import { ReactNode } from "react";
import { Zap, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RequireAuth = ({ children, roles }: { children: ReactNode; roles?: Role[] }) => {
  const { user, loading, authError, logout } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Zap className="size-5 text-accent animate-pulse" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!user) {
    // If there's an auth error, show it on the login page
    if (authError) {
      return (
        <div className="min-h-screen grid place-items-center bg-background p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="size-16 rounded-2xl bg-destructive/10 grid place-items-center mx-auto">
              <ShieldAlert className="size-8 text-destructive" />
            </div>
            <h1 className="font-display text-3xl">Authentication Error</h1>
            <p className="text-muted-foreground text-sm">{authError}</p>
            <Button
              onClick={() => logout()}
              variant="outline"
              className="mx-auto"
            >
              Return to Login
            </Button>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // User must change password — redirect to change-password page
  if (user.mustChangePassword && loc.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // User has no role assigned — show a clear message, block protected pages
  if (user.role === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="size-16 rounded-2xl bg-amber-500/10 grid place-items-center mx-auto">
            <ShieldAlert className="size-8 text-amber-500" />
          </div>
          <h1 className="font-display text-3xl">No Role Assigned</h1>
          <p className="text-muted-foreground text-sm">
            Your account exists but has no role assigned. Please contact your administrator
            to assign you a role (Student, Staff, or Super Admin).
          </p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
            <div className="font-bold text-amber-500 uppercase tracking-widest text-[10px] mb-1">Account Info</div>
            <div>{user.name} · {user.email}</div>
            <div className="font-mono mt-1 text-[10px]">ID: {user.id}</div>
          </div>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="mx-auto"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Role-based access check
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};
