import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  variant?: "default" | "gold" | "primary";
};

export const StatCard = ({ label, value, sub, icon: Icon, variant = "default" }: Props) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-border p-5 bg-gradient-card shadow-card group transition-smooth hover:-translate-y-0.5",
      variant === "gold" && "border-accent/40",
      variant === "primary" && "border-primary/40",
    )}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">{label}</div>
        <div className={cn(
          "size-10 rounded-xl grid place-items-center",
          variant === "gold" ? "bg-gradient-gold text-accent-foreground" :
          variant === "primary" ? "bg-gradient-primary text-primary-foreground" :
          "bg-secondary text-foreground"
        )}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-4 font-display text-5xl leading-none font-mono-stat">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
      <div className="absolute -bottom-10 -right-10 size-32 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/15 transition-smooth" />
    </div>
  );
};
