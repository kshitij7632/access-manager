import { Trophy, Crown, Sparkles, Users } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";

export const WinnerPanel = ({ examId }: { examId: string }) => {
  const { exams, teamLeaderboard, individualLeaderboard } = useAppState();
  const exam = exams.find(e => e.id === examId);
  if (!exam) return null;

  const tlb = teamLeaderboard(examId);
  const ilb = individualLeaderboard(examId);
  const winner = tlb[0];
  const topper = ilb[0];

  // Empty state if nothing scored
  const hasScores = ilb.some(r => r.marks > 0);
  if (!hasScores) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <Sparkles className="size-6 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">No marks uploaded yet for this exam.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-primary p-6 md:p-8 shadow-elegant">
      {/* Decorative glow */}
      <div aria-hidden className="absolute -top-24 -right-24 size-[320px] rounded-full bg-accent/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -left-24 size-[280px] rounded-full bg-primary-glow/30 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] animate-pulse">
            <Sparkles className="size-3" /> Results In
          </span>
          <span className="text-primary-foreground/70 text-xs uppercase tracking-widest">{exam.name} · {exam.subject}</span>
        </div>

        <h2 className="font-display text-5xl md:text-6xl text-primary-foreground leading-none">
          AND THE WINNERS<br/><span className="text-accent">ARE…</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mt-7">
          {/* Winning Team */}
          <div className="rounded-xl bg-background/10 backdrop-blur border border-primary-foreground/20 p-5">
            <div className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-[0.3em]">
              <Trophy className="size-4" /> Winning Team
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-4xl text-primary-foreground truncate">{winner.team.name}</div>
                <div className="text-primary-foreground/70 text-xs mt-1 italic truncate">"{winner.team.motto}"</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-stat text-5xl text-accent leading-none">{winner.avg.toFixed(1)}</div>
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mt-1">Avg score</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary-foreground/15 flex items-center gap-2 text-xs text-primary-foreground/70">
              <Users className="size-3" /> {winner.members.length} members · Top in team: <span className="text-accent font-bold ml-1">{winner.topPerformer.m.name}</span>
            </div>
          </div>

          {/* Top Scorer */}
          <div className="rounded-xl bg-background/10 backdrop-blur border border-primary-foreground/20 p-5">
            <div className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-[0.3em]">
              <Crown className="size-4" /> Top Scorer
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-14 rounded-xl bg-gradient-gold grid place-items-center shadow-gold shrink-0">
                  <span className="font-display text-xl text-accent-foreground">{topper.student.avatar}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-display text-3xl text-primary-foreground truncate">{topper.student.name}</div>
                  <div className="text-primary-foreground/70 text-xs mt-0.5 truncate">{topper.team.name} · {topper.student.branch}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-stat text-5xl text-accent leading-none">{topper.marks}</div>
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mt-1">/ {exam.totalMarks}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary-foreground/15 text-xs text-primary-foreground/70">
              Runner-up: <span className="text-primary-foreground font-bold">{ilb[1]?.student.name ?? "—"}</span> · {ilb[1]?.marks ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
