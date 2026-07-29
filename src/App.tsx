import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { AppStateProvider } from "@/context/AppStateContext";
import { AuditProvider } from "@/context/AuditContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { RequireAuth } from "@/components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Exams from "./pages/Exams";
import Teams from "./pages/Teams";
import TeamBuilder from "./pages/TeamBuilder";
import Students from "./pages/Students";
import Users from "./pages/Users";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import MarksUpload from "./pages/MarksUpload";
import Profile from "./pages/Profile";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuditProvider>
            <NotificationsProvider>
              <AppStateProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
                  <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/exams" element={<Exams />} />
                    <Route
                      path="/upload"
                      element={
                        <RequireAuth roles={["staff", "super_admin"]}>
                          <MarksUpload />
                        </RequireAuth>
                      }
                    />
                    <Route path="/teams" element={<Teams />} />
                    <Route
                      path="/teams/builder"
                      element={
                        <RequireAuth roles={["staff", "super_admin"]}>
                          <TeamBuilder />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/students"
                      element={
                        <RequireAuth roles={["staff", "super_admin"]}>
                          <Students />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <RequireAuth roles={["staff", "super_admin"]}>
                          <Users />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/audit"
                      element={
                        <RequireAuth roles={["super_admin"]}>
                          <AuditLog />
                        </RequireAuth>
                      }
                    />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppStateProvider>
            </NotificationsProvider>
          </AuditProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
