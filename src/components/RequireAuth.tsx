import { Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "@/context/AuthContext";
import { ReactNode } from "react";

export const RequireAuth = ({ children, roles }: { children: ReactNode; roles?: Role[] }) => {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
