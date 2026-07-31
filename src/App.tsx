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
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      useErrorBoundary: false,
      onError: (err) => {
        console.error("React Query error:", err);
      },
    },
    mutations: {
      onError: (err) => {
        console.error("React Query mutation error:", err);
      },
    },
  },
});

const App = () => (
  <ErrorBoundary fallbackName="Root App">
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
                    <Route path="/login" element={<ErrorBoundary fallbackName="Login"><Login /></ErrorBoundary>} />
                    <Route path="/change-password" element={<RequireAuth><ErrorBoundary fallbackName="Change Password"><ChangePassword /></ErrorBoundary></RequireAuth>} />
                    <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                      <Route path="/" element={<ErrorBoundary fallbackName="Dashboard"><Dashboard /></ErrorBoundary>} />
                      <Route path="/profile" element={<ErrorBoundary fallbackName="Profile"><Profile /></ErrorBoundary>} />
                      <Route path="/leaderboard" element={<ErrorBoundary fallbackName="Leaderboard"><Leaderboard /></ErrorBoundary>} />
                      <Route path="/exams" element={<ErrorBoundary fallbackName="Exams"><Exams /></ErrorBoundary>} />
                      <Route
                        path="/upload"
                        element={
                          <RequireAuth roles={["staff", "super_admin"]}>
                            <ErrorBoundary fallbackName="Marks Upload">
                              <MarksUpload />
                            </ErrorBoundary>
                          </RequireAuth>
                        }
                      />
                      <Route path="/teams" element={<ErrorBoundary fallbackName="Teams"><Teams /></ErrorBoundary>} />
                      <Route
                        path="/teams/builder"
                        element={
                          <RequireAuth roles={["staff", "super_admin"]}>
                            <ErrorBoundary fallbackName="Team Builder">
                              <TeamBuilder />
                            </ErrorBoundary>
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/students"
                        element={
                          <RequireAuth roles={["staff", "super_admin"]}>
                            <ErrorBoundary fallbackName="Students">
                              <Students />
                            </ErrorBoundary>
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <RequireAuth roles={["staff", "super_admin"]}>
                            <ErrorBoundary fallbackName="Users">
                              <Users />
                            </ErrorBoundary>
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/audit"
                        element={
                          <RequireAuth roles={["super_admin"]}>
                            <ErrorBoundary fallbackName="Audit Log">
                              <AuditLog />
                            </ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
