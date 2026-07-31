import { PageHeader } from "@/components/PageHeader";
import { useAppState } from "@/context/AppStateContext";
import { Button } from "@/components/ui/button";
import { Plus, Crown, Flame, TrendingUp, TrendingDown, Minus, Trophy, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const Teams = () => {
  const { exams, teamLeaderboard, getStudent, latestExamId } = useAppState();

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [exams]
  );
  const latestIdx = Math.max(0, sortedExams.findIndex(e => e.id === latestExamId));
  const currentExam = sortedExams[latestIdx] ?? sortedExams[sortedExams.length - 1];
  const prevExam = sortedExams[latestIdx - 1];

  const tlb = currentExam ? teamLeaderboard(currentExam.id) : [];
  const prevTlb = prevExam ? teamLeaderboard(prevExam.id) : null;
  const leaderAvg = tlb[0]?.avg ?? 0;

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Squads"
        title="Teams"
        description="Form rosters, name a captain, march to the podium together."
        action={
          <Button
            size="lg"
            onClick={() => toast.success("Open Team Builder from the sidebar")}
            className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold"
          >
            <Plus className="size-4 mr-1" /> New Team
          </Button>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        {tlb.map((row, idx) => {
          const team = row.team;
          const members = row.members;
          const captain = team.captainId ? getStudent(team.captainId) : null;
          const prevRank = prevTlb?.find(t => t.team.id === team.id)?.rank;
          const prevAvg = prevTlb?.find(t => t.team.id === team.id)?.avg ?? row.avg;
          const movement = prevRank ? prevRank - row.rank : 0;
          const delta = row.avg - prevAvg;
          const gapToLeader = leaderAvg - row.avg;
          const onFire = movement >= 2 || (row.rank === 1 && delta >= 0);

          const captainScore =
            (captain && row.topPerformer?.m.id === captain.id) ? row.topPerformer.marks : Math.round(row.avg);

          return (
            <div
              key={team.id}
              className="group relative rounded-3xl border border-border bg-gradient-card overflow-hidden shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant animate-fade-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Color bar */}
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `hsl(${team.color})` }} />
              {/* Ambient glow */}
              <div
                aria-hidden
                className="absolute -top-20 -right-20 size-56 rounded-full blur-3xl opacity-40 transition-smooth group-hover:opacity-70"
                style={{ background: `hsl(${team.color} / 0.5)` }}
              />

              <div
                className="p-6 relative"
                style={{ background: `linear-gradient(135deg, hsl(${team.color} / 0.28), transparent 70%)` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="text-[10px] uppercase tracking-[0.25em] font-bold px-2 py-0.5 rounded-md"
                        style={{ color: `hsl(${team.color})`, background: `hsl(${team.color} / 0.12)` }}
                      >
                        Rank #{row.rank}
                      </div>
                      {onFire && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent">
                          <Flame className="size-3" /> On fire
                        </span>
                      )}
                      {row.rank === 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md bg-gradient-gold text-accent-foreground shadow-gold">
                          <Trophy className="size-3" /> Leader
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-4xl mt-2">{team.name}</h3>
                    <div className="text-sm text-muted-foreground italic mt-1">"{team.motto}"</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg</div>
                    <div className="font-mono-stat text-4xl text-accent leading-none">{row.avg.toFixed(1)}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold">
                      {movement > 0 && (
                        <span className="text-success inline-flex items-center gap-0.5">
                          <TrendingUp className="size-3" /> +{movement}
                        </span>
                      )}
                      {movement < 0 && (
                        <span className="text-destructive inline-flex items-center gap-0.5">
                          <TrendingDown className="size-3" /> {movement}
                        </span>
                      )}
                      {movement === 0 && prevRank && (
                        <span className="text-muted-foreground inline-flex items-center gap-0.5">
                          <Minus className="size-3" /> hold
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context chips */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 border border-border text-xs">
                    <Crown className="size-3 text-accent" /> Captain ·{" "}
                    <span className="font-semibold">{captain?.name ?? "None"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 border border-border text-xs">
                    <Sparkles className="size-3 text-accent" /> Top ·{" "}
                    <span className="font-semibold">{row.topPerformer?.m.name.split(" ")[0]}</span>
                    <span className="font-mono-stat text-accent">{row.topPerformer?.marks}</span>
                  </div>
                  {row.rank > 1 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 border border-border text-xs">
                      <Target className="size-3 text-primary-glow" />
                      <span className="text-muted-foreground">Only</span>
                      <span className="font-mono-stat text-foreground">{gapToLeader.toFixed(1)}</span>
                      <span className="text-muted-foreground">pts behind leader</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance bar vs leader */}
              <div className="px-6 pt-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                  <span>Pace vs leader</span>
                  <span className="font-mono-stat text-foreground">
                    {Math.round((row.avg / Math.max(leaderAvg, 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (row.avg / Math.max(leaderAvg, 1)) * 100)}%`,
                      background: `linear-gradient(90deg, hsl(${team.color}), hsl(${team.color} / 0.6))`,
                    }}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Roster · {members.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Captain score{" "}
                    <span className="font-mono-stat text-accent">{captainScore}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const isCaptain = m.id === team.captainId;
                    const isTop = row.topPerformer?.m.id === m.id;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-smooth hover:-translate-y-0.5",
                          isCaptain
                            ? "bg-gradient-gold text-accent-foreground shadow-gold font-bold"
                            : isTop
                            ? "bg-accent/15 text-accent border border-accent/30"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "size-6 rounded-full text-[10px] font-bold grid place-items-center",
                            isCaptain
                              ? "bg-accent-foreground/20 text-accent-foreground"
                              : "bg-gradient-primary text-primary-foreground"
                          )}
                        >
                          {m.avatar}
                        </span>
                        {m.name.split(" ")[0]}
                        {isCaptain && <Crown className="size-3" />}
                        {!isCaptain && isTop && <Flame className="size-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Teams;
