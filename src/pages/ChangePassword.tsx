import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

export const ChangePassword = () => {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (next === "student123") {
      toast.error("Please pick a custom password different from the default 'student123'");
      return;
    }

    setSubmitting(true);
    const res = await changePassword(current, next);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error ?? "Failed to update password");
      return;
    }

    toast.success("Password updated successfully!", {
      description: "You now have full access to ScoreBuzz.",
    });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
            <Zap className="size-5 text-accent-foreground" strokeWidth={3} />
          </div>
          <div className="font-display text-2xl">SCORE<span className="text-accent">BUZZ</span></div>
        </div>

        <div className="rounded-2xl border border-gold/30 bg-card p-6 shadow-xl space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider bg-accent/10 px-2.5 py-1 rounded-full mb-2">
              <Lock className="size-3.5" /> First-time login security
            </div>
            <h1 className="font-display text-3xl">Change Your Password</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Hi {user?.name || "Student"}, your account was created with a temporary password. Please create a new private password to unlock your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cp-email">Account Email</Label>
              <Input id="cp-email" value={user?.email || ""} disabled className="bg-muted/50 font-mono text-xs" />
            </div>

            <div>
              <Label htmlFor="cp-current">Current Temporary Password</Label>
              <Input
                id="cp-current"
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="student123"
                required
              />
            </div>

            <div>
              <Label htmlFor="cp-next">New Password <span className="text-muted-foreground text-xs font-normal">(min 6 chars)</span></Label>
              <Input
                id="cp-next"
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                required
                minLength={6}
                maxLength={60}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <Label htmlFor="cp-confirm">Confirm New Password</Label>
              <Input
                id="cp-confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                maxLength={60}
                placeholder="Re-enter new password"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold"
            >
              <ShieldCheck className="size-4 mr-2" />
              {submitting ? "Updating..." : "Update Password & Enter Arena"}
            </Button>
          </form>

          <div className="pt-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
            <span>Need assistance? Contact staff.</span>
            <button
              onClick={() => logout()}
              type="button"
              className="text-destructive hover:underline font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
