import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Lock } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  if (user) return <Navigate to="/" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(siEmail.trim(), siPassword);
    if (!res.ok) {
      toast.error(res.error ?? "Sign in failed");
      return;
    }
    if (res.mustReset) {
      toast.warning("Please set a new password");
      navigate(`/reset-password?email=${encodeURIComponent(siEmail.trim())}`);
      return;
    }
    toast.success("Welcome back");
    navigate("/");
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
            <div className="font-bold text-accent uppercase tracking-widest text-[10px]">Access</div>
            <div>Accounts are provisioned by your admin.</div>
            <div>Forgot your password? Use the reset link below.</div>
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

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Welcome back</div>
            <h2 className="font-display text-4xl mt-1">Enter the arena</h2>
            <p className="text-muted-foreground text-sm mt-2">Use the email and password issued to you.</p>
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

          <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-3 text-xs text-muted-foreground">
            <Lock className="size-4 mt-0.5 text-accent flex-shrink-0" />
            <div>
              <span className="text-foreground font-medium">Accounts are issued, not self-created.</span> Students get credentials from staff. Staff accounts are issued by a super admin.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
