import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const { resetPasswordWithTemp, logout } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [temp, setTemp] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    const res = await resetPasswordWithTemp(email.trim(), temp, next);
    if (!res.ok) {
      toast.error(res.error ?? "Reset failed");
      return;
    }
    await logout();
    toast.success("Password updated", { description: "Sign in with your new password." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Set new password</div>
          <h1 className="font-display text-4xl mt-1">Reset password</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Use the temporary password you received and pick a new one.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="rp-email">Email</Label>
            <Input id="rp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="rp-temp">Temporary password</Label>
            <Input id="rp-temp" value={temp} onChange={e => setTemp(e.target.value)} required maxLength={60} className="font-mono tracking-wider" />
          </div>
          <div>
            <Label htmlFor="rp-new">New password <span className="text-muted-foreground font-normal">(min 6 chars)</span></Label>
            <Input id="rp-new" type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={6} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="rp-confirm">Confirm new password</Label>
            <Input id="rp-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} maxLength={60} />
          </div>
          <Button type="submit" size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
            <ShieldCheck className="size-4 mr-2" /> Update password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
