import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Briefcase, GraduationCap, Save, KeyRound, IdCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleMeta = {
  super_admin: { label: "Super Admin", icon: Shield,        cls: "bg-accent/15 text-accent border-accent/30" },
  staff:       { label: "Staff",       icon: Briefcase,     cls: "bg-primary/10 text-primary border-primary/30" },
  student:     { label: "Student",     icon: GraduationCap, cls: "bg-muted text-muted-foreground border-border" },
} as const;

const NO_ROLE_META = { label: "No Role", icon: Shield, cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" } as const;

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  if (!user) return null;
  const meta = user.role ? roleMeta[user.role] : NO_ROLE_META;
  const Icon = meta.icon;

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateProfile({ name, email });
    setSavingProfile(false);
    if (!res.ok) { toast.error(res.error ?? "Could not save"); return; }
    toast.success("Profile updated");
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast.error("Passwords don't match"); return; }
    setSavingPw(true);
    const res = await changePassword(current, next);
    setSavingPw(false);
    if (!res.ok) { toast.error(res.error ?? "Could not change password"); return; }
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password changed");
  };

  const initials = (user?.name || user?.email || "U").trim().split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl">
      <PageHeader eyebrow="Account" title="Your profile" description="Update your details and password." />

      {/* Identity card */}
      <div className="rounded-2xl border border-border bg-gradient-card p-6 flex flex-wrap items-center gap-5">
        <div className="size-20 rounded-2xl bg-gradient-gold grid place-items-center text-accent-foreground font-display text-3xl shadow-gold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl truncate">{user.name}</div>
          <div className="text-muted-foreground text-sm truncate">{user.email}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={cn("gap-1", meta.cls)}>
              <Icon className="size-3" /> {meta.label}
            </Badge>
            <Badge variant="outline" className="gap-1 font-mono">
              <IdCard className="size-3" /> {user.id}
            </Badge>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <form onSubmit={handleProfile} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Details</div>
          <h2 className="font-display text-2xl mt-1">Personal info</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pf-name">Full name</Label>
            <Input id="pf-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="pf-email">Email</Label>
            <Input id="pf-email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} />
          </div>
        </div>
        <Button type="submit" disabled={savingProfile} className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
          <Save className="size-4 mr-2" /> Save changes
        </Button>
      </form>

      {/* Change password */}
      <form onSubmit={handlePassword} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Security</div>
          <h2 className="font-display text-2xl mt-1">Change password</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="pf-current">Current password</Label>
            <Input id="pf-current" type="password" value={current} onChange={e => setCurrent(e.target.value)} required maxLength={60} />
          </div>
          <div>
            <Label htmlFor="pf-next">New password</Label>
            <Input id="pf-next" type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={6} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="pf-confirm">Confirm new</Label>
            <Input id="pf-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} maxLength={60} />
          </div>
        </div>
        <Button type="submit" disabled={savingPw} variant="secondary">
          <KeyRound className="size-4 mr-2" /> Update password
        </Button>
      </form>
    </div>
  );
};

export default Profile;
