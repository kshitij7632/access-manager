import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, Copy } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = requestPasswordReset(email.trim());
    if (!res.ok) {
      toast.error(res.error ?? "Could not issue reset");
      return;
    }
    setIssued({ email: email.trim(), tempPassword: res.tempPassword! });
    toast.success("Temporary password issued");
  };

  const copy = () => {
    if (!issued) return;
    navigator.clipboard.writeText(issued.tempPassword);
    toast.success("Copied");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Account recovery</div>
          <h1 className="font-display text-4xl mt-1">Forgot password?</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Enter your email and we'll generate a temporary password. <span className="text-foreground">In production, this would be emailed.</span>
          </p>
        </div>

        {!issued ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@scorebuzz.app" required maxLength={120} />
            </div>
            <Button type="submit" size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
              <KeyRound className="size-4 mr-2" /> Issue temporary password
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-accent font-bold">Temporary password</div>
              <div className="flex items-center justify-between gap-3">
                <code className="font-mono text-lg font-bold tracking-wider">{issued.tempPassword}</code>
                <Button variant="ghost" size="icon" onClick={copy} className="text-accent hover:text-accent">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use it to sign in once. You'll be asked to set a new password right after.
              </p>
            </div>
            <Button asChild size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
              <Link to={`/reset-password?email=${encodeURIComponent(issued.email)}`}>Continue to reset</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
