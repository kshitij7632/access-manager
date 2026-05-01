import { Flame } from "lucide-react";

const items = [
  "🏆 Team Alpha leads the Grand Test by 6.4 pts",
  "🔥 Aarav Sharma — highest single-test score: 188/200",
  "⚡ Team Nova has 3 students in the Top 10",
  "📈 Average team score up 12% vs last week",
  "🎯 Mock Test 03 — Maths topper: Diya Reddy",
];

export const LiveTicker = () => {
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden bg-accent text-accent-foreground border-y border-accent-glow/40">
      <div className="absolute left-0 top-0 bottom-0 z-10 px-3 flex items-center gap-2 bg-foreground text-background font-display text-sm tracking-widest">
        <Flame className="size-4" /> LIVE
      </div>
      <div className="ticker flex whitespace-nowrap py-2 pl-24">
        {loop.map((t, i) => (
          <span key={i} className="px-8 text-sm font-semibold tracking-wide">
            {t} <span className="opacity-40 mx-2">•</span>
          </span>
        ))}
      </div>
    </div>
  );
};
