import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppState } from "@/context/AppStateContext";
import { WinnerPanel } from "@/components/WinnerPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Medal, Trophy, TrendingUp, TrendingDown, Minus, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const rankBadge = (rank: number) => {
  if (rank === 1) return { icon: Crown, cls: "bg-gradient-gold text-accent-foreground shadow-gold" };
  if (rank === 2) return { icon: Medal, cls: "bg-secondary text-foreground" };
  if (rank === 3) return { icon: Medal, cls: "bg-primary/40 text-foreground" };
  return { icon: Trophy, cls: "bg-muted text-muted-foreground" };
};

const Movement = ({ delta }: { delta: number | undefined }) => {
  if (delta === undefined) return null;
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-success text-[11px] font-bold">
        <TrendingUp className="size-3" /> {delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-bold">
        <TrendingDown className="size-3" /> {Math.abs(delta)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="size-3" />
    </span>
  );
};

const Leaderboard = () => {
  const { exams, latestExamId, individualLeaderboard, teamLeaderboard } = useAppState();
  const [examId, setExamId] = useState<string>("");
  if (exams.length === 0) {
    return (
      <div className="px-4 md:px-10 py-12 text-center text-muted-foreground">
        No exams yet. Create one from the Exams page.
      </div>
    );
  }
  const activeExamId = examId || latestExamId || exams[0].id;

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [exams]
  );
  const currentIdx = sortedExams.findIndex(e => e.id === activeExamId);
  const prevExam = currentIdx > 0 ? sortedExams[currentIdx - 1] : null;

  const ilb = individualLeaderboard(activeExamId);
  const tlb = teamLeaderboard(activeExamId);
  const prevIlb = prevExam ? individualLeaderboard(prevExam.id) : null;
  const prevTlb = prevExam ? teamLeaderboard(prevExam.id) : null;
  const exam = exams.find(e => e.id === activeExamId) ?? exams[0];

  const podium = tlb.slice(0, 3);
  const restTeams = tlb.slice(3);
  const leaderTeamAvg = tlb[0]?.avg ?? 0;
  const leaderIndvMarks = ilb[0]?.marks ?? 0;

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Live Standings"
        title="Leaderboard"
        description="Switch between team and individual ranks. Pick any exam to rewind the action."
        action={
          <Select value={activeExamId || undefined} onValueChange={setExamId}>
            <SelectTrigger className="w-56 bg-card border-border">
              <SelectValue placeholder="Select an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.length === 0 ? (
                <SelectItem value="placeholder-no-exams" disabled>No exams available</SelectItem>
              ) : (
                exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} · {e.subject}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-8">
        <WinnerPanel examId={activeExamId} />
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger
            value="teams"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg px-6 py-2 font-bold uppercase tracking-wider text-xs"
          >
            Teams
          </TabsTrigger>
          <TabsTrigger
            value="individuals"
            className="data-[state=active]:bg-gradient-gold data-[state=active]:text-accent-foreground rounded-lg px-6 py-2 font-bold uppercase tracking-wider text-xs"
          >
            Individuals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6 space-y-6">
          {/* Sticky podium */}
          <div className="sticky top-16 z-10 -mx-2 px-2 py-3 backdrop-blur bg-background/70 rounded-2xl border border-border">
            <div className="grid grid-cols-3 gap-3">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((row, idx) => {
                const order = [1, 0, 2][idx];
                const medals = ["🥈", "🥇", "🥉"];
                const heights = ["h-20 md:h-24", "h-28 md:h-32", "h-16 md:h-20"];
                const prev = prevTlb?.find(t => t.team.id === row.team.id);
                const delta = prev ? prev.rank - row.rank : undefined;
                return (
                  <div
                    key={row.team.id}
                    className={cn(
                      "rounded-2xl border p-3 md:p-4 flex flex-col justify-end transition-smooth animate-fade-up",
                      order === 0
                        ? "border-accent/50 bg-gradient-to-b from-accent/15 to-transparent shadow-gold"
                        : "border-border bg-gradient-card"
                    )}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-2xl md:text-3xl">{medals[idx]}</div>
                      <Movement delta={delta} />
                    </div>
                    <div className="mt-2 font-display text-lg md:text-2xl truncate">{row.team.name}</div>
                    <div className="font-mono-stat text-2xl md:text-3xl text-accent">{row.avg.toFixed(1)}</div>
                    <div className={cn(heights[idx], "mt-2 rounded-t-xl", order === 0 ? "bg-accent/25" : "bg-primary/25")} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remaining teams */}
          {restTeams.length > 0 && (
            <div className="space-y-3">
              {restTeams.map((row, i) => {
                const { icon: Icon, cls } = rankBadge(row.rank);
                const prev = prevTlb?.find(t => t.team.id === row.team.id);
                const delta = prev ? prev.rank - row.rank : undefined;
                const gap = leaderTeamAvg - row.avg;
                return (
                  <div
                    key={row.team.id}
                    className="grid grid-cols-[auto,1fr,auto] md:grid-cols-[auto,2fr,1.4fr,1fr,auto] items-center gap-4 p-5 rounded-2xl border border-border bg-gradient-card transition-smooth hover:-translate-y-0.5 hover:border-primary/40 animate-fade-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className={cn("size-12 rounded-xl grid place-items-center font-display text-xl", cls)}>
                      {row.rank <= 3 ? <Icon className="size-5" /> : `#${row.rank}`}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-display text-2xl truncate">{row.team.name}</div>
                        <Movement delta={delta} />
                      </div>
                      <div className="text-xs text-muted-foreground italic truncate">"{row.team.motto}"</div>
                    </div>
                    <div className="hidden md:block text-xs">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Behind leader</div>
                      <div className="inline-flex items-center gap-1 text-foreground font-mono-stat">
                        <Target className="size-3 text-primary-glow" /> {gap.toFixed(1)} pts
                      </div>
                    </div>
                    <div className="hidden md:block text-sm text-muted-foreground truncate">
                      <div className="text-[10px] uppercase tracking-widest">Top</div>
                      <div className="text-foreground truncate">{row.topPerformer?.m.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg</div>
                      <div className="font-mono-stat text-3xl text-accent">{row.avg.toFixed(1)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="individuals" className="mt-6">
          <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
            <div className="hidden md:grid grid-cols-[60px,2fr,1.5fr,1fr,1fr,auto] gap-4 px-6 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border bg-background/40">
              <div>Rank</div>
              <div>Student</div>
              <div>Team</div>
              <div>Branch</div>
              <div>Gap</div>
              <div className="text-right">Marks</div>
            </div>
            {ilb.map((row, i) => {
              const { icon: Icon, cls } = rankBadge(row.rank);
              const prev = prevIlb?.find(r => r.student.id === row.student.id);
              const delta = prev ? prev.rank - row.rank : undefined;
              const gap = leaderIndvMarks - row.marks;
              const onFire = (delta ?? 0) >= 3;
              return (
                <div
                  key={row.student.id}
                  className={cn(
                    "grid grid-cols-[40px,1fr,auto] md:grid-cols-[60px,2fr,1.5fr,1fr,1fr,auto] items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 transition-smooth hover:bg-secondary/40 animate-fade-up",
                    row.rank === 1 && "bg-accent/5"
                  )}
                  style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
                >
                  <div className={cn("size-9 rounded-lg grid place-items-center font-mono-stat text-sm font-bold", cls)}>
                    {row.rank <= 3 ? <Icon className="size-4" /> : row.rank}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-secondary grid place-items-center text-xs font-bold flex-shrink-0">
                      {row.student.avatar}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        {row.student.name}
                        {onFire && <Flame className="size-3.5 text-accent" />}
                        <Movement delta={delta} />
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden">{row.team.name}</div>
                    </div>
                  </div>
                  <div className="hidden md:block text-sm">{row.team.name}</div>
                  <div className="hidden md:block text-sm text-muted-foreground">{row.student.branch}</div>
                  <div className="hidden md:block text-sm">
                    {row.rank === 1 ? (
                      <span className="text-accent font-bold uppercase text-[10px] tracking-widest">Leader</span>
                    ) : (
                      <span className="text-muted-foreground font-mono-stat text-xs">−{gap} pts</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono-stat text-2xl text-accent">{row.marks}</span>
                    <span className="text-muted-foreground text-sm ml-1">/{exam?.totalMarks ?? 100}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
