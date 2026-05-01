import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { user, login, registerStudent } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [createdAccount, setCreatedAccount] = useState<{ id: string; name: string; email: string } | null>(null);

  // signin
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // signup (student-only)
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  if (user) return <Navigate to="/" replace />;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(siEmail.trim(), siPassword);
    if (!res.ok) {
      toast.error(res.error ?? "Sign in failed");
      return;
    }
    if (res.mustReset) {
      toast.warning("Please set a new password", { description: "You signed in with a temporary password." });
      navigate(`/reset-password?email=${encodeURIComponent(siEmail.trim())}`);
      return;
    }
    toast.success("Welcome back");
    navigate("/");
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerStudent({ name: suName, email: suEmail.trim(), password: suPassword });
    if (!res.ok) {
      toast.error(res.error ?? "Registration failed");
      return;
    }
    toast.success("Account created", { description: `Your student ID: ${res.user?.id}` });
    setCreatedAccount({ id: res.user!.id, name: res.user!.name, email: res.user!.email });
    setSuName(""); setSuEmail(""); setSuPassword("");
  };

  const goToSignIn = () => {
    if (createdAccount) setSiEmail(createdAccount.email);
    setCreatedAccount(null);
    setTab("signin");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-primary p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
            <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
          </div>
          <div className="font-display text-3xl text-primary-foreground">SCORE<span className="text-accent">BUZZ</span></div>
        </div>
        <div className="relative z-10">
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Live arena</div>
          <h1 className="font-display text-6xl text-primary-foreground leading-[0.95] mt-3">
            STUDY.<br/>COMPETE.<br/><span className="text-accent">DOMINATE.</span>
          </h1>
          <p className="text-primary-foreground/70 mt-6 max-w-md text-lg">
            Where every test is a stadium and every student is a starter.
          </p>
          <div className="mt-8 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 text-primary-foreground/80 text-xs space-y-1">
            <div className="font-bold text-accent uppercase tracking-widest text-[10px]">Demo accounts</div>
            <div>admin@scorebuzz.app · admin123</div>
            <div>staff@scorebuzz.app · staff123</div>
            <div>student@scorebuzz.app · student123</div>
          </div>
        </div>
        <div className="text-xs text-primary-foreground/50">© ScoreBuzz · Demo build</div>
        <div aria-hidden className="absolute -right-32 -bottom-32 size-[480px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
              <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
            </div>
            <div className="font-display text-2xl">SCORE<span className="text-accent">BUZZ</span></div>
          </div>

          {createdAccount ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-accent/15 grid place-items-center">
                  <CheckCircle2 className="size-7 text-accent" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Account ready</div>
                  <h2 className="font-display text-3xl mt-1">Welcome, {createdAccount.name.split(" ")[0]}!</h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your student account has been created. Save your <span className="text-foreground font-medium">Student ID</span> — you'll use your email and password to sign in.
              </p>

              <div className="rounded-2xl border border-accent/40 bg-gradient-card p-5 shadow-gold space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Student ID</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="font-mono text-2xl text-accent">{createdAccount.id}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(createdAccount.id);
                        toast.success("ID copied");
                      }}
                    >
                      <Copy className="size-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email</div>
                  <div className="font-medium mt-1 break-all">{createdAccount.email}</div>
                </div>
              </div>

              <Button
                onClick={goToSignIn}
                size="lg"
                className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold"
              >
                Continue to sign in
              </Button>
            </div>
          ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Student sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-6 mt-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Welcome back</div>
                <h2 className="font-display text-4xl mt-1">Enter the arena</h2>
                <p className="text-muted-foreground text-sm mt-2">Use your email and password.</p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder="you@scorebuzz.app" required maxLength={120} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-accent hover:underline font-medium">Forgot?</Link>
                  </div>
                  <Input id="si-password" type="password" value={siPassword} onChange={e => setSiPassword(e.target.value)} placeholder="••••••••" required maxLength={60} />
                </div>
                <Button type="submit" size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6 mt-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">New student?</div>
                <h2 className="font-display text-4xl mt-1">Join the league</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Self-registration is for <span className="text-foreground font-medium">students</span> only. Staff and admin accounts are issued by an existing admin.
                </p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" value={suName} onChange={e => setSuName(e.target.value)} placeholder="e.g. Aarav Sharma" required maxLength={60} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="you@scorebuzz.app" required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="su-password">Password <span className="text-muted-foreground font-normal">(min 6 chars)</span></Label>
                  <Input id="su-password" type="password" value={suPassword} onChange={e => setSuPassword(e.target.value)} placeholder="••••••••" required minLength={6} maxLength={60} />
                </div>
                <Button type="submit" size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
                  Create student account
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  An ID like <span className="font-mono text-foreground">STU-2026-007</span> is generated automatically.
                </p>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
