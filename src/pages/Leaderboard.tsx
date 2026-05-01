import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { latestExamId } from "@/data/mock";
import { useAppState } from "@/context/AppStateContext";
import { WinnerPanel } from "@/components/WinnerPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const rankBadge = (rank: number) => {
  if (rank === 1) return { icon: Crown, cls: "bg-gradient-gold text-accent-foreground shadow-gold" };
  if (rank === 2) return { icon: Medal, cls: "bg-secondary text-foreground" };
  if (rank === 3) return { icon: Medal, cls: "bg-primary/40 text-foreground" };
  return { icon: Trophy, cls: "bg-muted text-muted-foreground" };
};

const Leaderboard = () => {
  const { exams, individualLeaderboard, teamLeaderboard } = useAppState();
  const [examId, setExamId] = useState(exams.find(e => e.id === latestExamId)?.id ?? exams[0].id);
  const ilb = individualLeaderboard(examId);
  const tlb = teamLeaderboard(examId);
  const exam = exams.find(e => e.id === examId)!;

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Live Standings"
        title="Leaderboard"
        description="Switch between team and individual ranks. Pick any exam to rewind the action."
        action={
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger className="w-56 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exams.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} · {e.subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-8">
        <WinnerPanel examId={examId} />
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg px-6 py-2 font-bold uppercase tracking-wider text-xs">Teams</TabsTrigger>
          <TabsTrigger value="individuals" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-accent-foreground rounded-lg px-6 py-2 font-bold uppercase tracking-wider text-xs">Individuals</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6">
          <div className="space-y-3">
            {tlb.map((row) => {
              const { icon: Icon, cls } = rankBadge(row.rank);
              return (
                <div
                  key={row.team.id}
                  className={cn(
                    "grid grid-cols-[auto,1fr,auto] md:grid-cols-[auto,2fr,1fr,1fr,auto] items-center gap-4 p-5 rounded-2xl border bg-gradient-card transition-smooth hover:-translate-y-0.5",
                    row.rank === 1 ? "border-accent/50 shadow-gold" : "border-border"
                  )}
                >
                  <div className={cn("size-12 rounded-xl grid place-items-center font-display text-xl", cls)}>
                    {row.rank <= 3 ? <Icon className="size-5" /> : `#${row.rank}`}
                  </div>
                  <div>
                    <div className="font-display text-2xl">{row.team.name}</div>
                    <div className="text-xs text-muted-foreground italic">"{row.team.motto}"</div>
                  </div>
                  <div className="hidden md:block text-sm text-muted-foreground">
                    <div className="text-[10px] uppercase tracking-widest">Members</div>
                    <div className="font-mono-stat text-foreground">{row.members.length}</div>
                  </div>
                  <div className="hidden md:block text-sm text-muted-foreground">
                    <div className="text-[10px] uppercase tracking-widest">Top</div>
                    <div className="text-foreground truncate">{row.topPerformer.m.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg</div>
                    <div className="font-mono-stat text-3xl text-accent">{row.avg.toFixed(1)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="individuals" className="mt-6">
          <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
            <div className="hidden md:grid grid-cols-[60px,2fr,1.5fr,1fr,auto] gap-4 px-6 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border bg-background/40">
              <div>Rank</div><div>Student</div><div>Team</div><div>Branch</div><div className="text-right">Marks</div>
            </div>
            {ilb.map((row) => {
              const { icon: Icon, cls } = rankBadge(row.rank);
              return (
                <div key={row.student.id} className={cn(
                  "grid grid-cols-[40px,1fr,auto] md:grid-cols-[60px,2fr,1.5fr,1fr,auto] items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 transition-smooth hover:bg-secondary/40",
                  row.rank === 1 && "bg-accent/5"
                )}>
                  <div className={cn("size-9 rounded-lg grid place-items-center font-mono-stat text-sm font-bold", cls)}>
                    {row.rank <= 3 ? <Icon className="size-4" /> : row.rank}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-secondary grid place-items-center text-xs font-bold flex-shrink-0">{row.student.avatar}</div>
                    <div className="truncate">
                      <div className="font-semibold truncate">{row.student.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{row.team.name}</div>
                    </div>
                  </div>
                  <div className="hidden md:block text-sm">{row.team.name}</div>
                  <div className="hidden md:block text-sm text-muted-foreground">{row.student.branch}</div>
                  <div className="text-right">
                    <span className="font-mono-stat text-2xl text-accent">{row.marks}</span>
                    <span className="text-muted-foreground text-sm ml-1">/{exam.totalMarks}</span>
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
