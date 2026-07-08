import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LiveTicker } from "@/components/LiveTicker";
import { MyScoresPanel } from "@/components/MyScoresPanel";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { Users, Trophy, FileText, Sparkles, Crown, Flame, ArrowUpRight, Upload, TrendingUp, Rocket, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { exams, students, individualLeaderboard, teamLeaderboard, getStudent, latestExamId } = useAppState();
  const { user } = useAuth();
  const canEdit = user?.role === "staff" || user?.role === "super_admin";

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [exams]
  );
  const latestExam = exams.find(e => e.id === latestExamId) ?? sortedExams[sortedExams.length - 1];
  if (!latestExam) {
    return (
      <div>
        <LiveTicker />
        <div className="px-4 md:px-10 py-12 text-center text-muted-foreground">
          Welcome. No exams yet — create one from the Exams page to see leaderboards.
        </div>
      </div>
    );
  }
  const latestIdx = sortedExams.findIndex(e => e.id === latestExam.id);
  const prevExam = latestIdx > 0 ? sortedExams[latestIdx - 1] : null;

  const tlb = teamLeaderboard(latestExam.id);
  const ilb = individualLeaderboard(latestExam.id);
  const prevTlb = prevExam ? teamLeaderboard(prevExam.id) : null;
  const winner = tlb[0];
  const topper = ilb[0];
  const podium = tlb.slice(0, 3);

  // Momentum: biggest climber by rank vs previous exam
  const movements = tlb.map(t => {
    const prev = prevTlb?.find(p => p.team.id === t.team.id);
    return {
      team: t.team,
      rankDelta: prev ? prev.rank - t.rank : 0,
      avgDelta: prev ? t.avg - prev.avg : 0,
      avg: t.avg,
    };
  });
  const climber = [...movements].sort((a, b) => b.rankDelta - a.rankDelta || b.avgDelta - a.avgDelta)[0];
  const mostImproved = [...movements].sort((a, b) => b.avgDelta - a.avgDelta)[0];

  // Captain performance: rank of the winning team's captain in individual board
  const captainStudent = getStudent(winner.team.captainId);
  const captainRow = ilb.find(r => r.student.id === captainStudent.id);

  return (
    <div>
      <LiveTicker />
      <div className="px-4 md:px-10 py-8 md:py-12">
        <PageHeader
          eyebrow={`Latest result · ${latestExam.name}`}
          title="The Arena"
          description="Real-time pulse of every exam, every team, every topper. Built to make studying feel like a stadium."
          action={
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button asChild size="lg" variant="secondary">
                  <Link to="/upload"><Upload className="mr-1 size-4" /> Upload Marks</Link>
                </Button>
              )}
              <Button asChild size="lg" className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
                <Link to="/leaderboard">View Leaderboard <ArrowUpRight className="ml-1 size-4" /></Link>
              </Button>
            </div>
          }
        />

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Students" value={students.length} icon={Users} sub="Across 4 teams" />
          <StatCard label="Exams Held" value={exams.length} icon={FileText} sub={`Latest · ${latestExam.subject}`} />
          <StatCard label="Winning Team" value={winner.team.name.replace("Team ", "")} icon={Trophy} variant="gold" sub={`Avg ${winner.avg.toFixed(1)} pts`} />
          <StatCard label="Top Scorer" value={topper.marks} icon={Crown} variant="primary" sub={topper.student.name} />
        </div>

        {/* Hero podium */}
        <section className="mt-10 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl bg-gradient-hero border border-primary/30 p-8 relative overflow-hidden shadow-elegant">
            <div className="absolute inset-0 bg-gradient-podium pointer-events-none" />
            <div className="relative">
              <div className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-2">Team Podium · {latestExam.name}</div>
              <h2 className="font-display text-4xl md:text-5xl mb-8">Who Owned The Arena</h2>

              <div className="grid grid-cols-3 gap-4 items-end">
                {[podium[1], podium[0], podium[2]].map((row, idx) => {
                  const heights = ["h-32", "h-44", "h-24"];
                  const medals = ["🥈", "🥇", "🥉"];
                  const order = [1, 0, 2][idx];
                  return (
                    <div key={row.team.id} className="flex flex-col items-center text-center">
                      <div className="text-3xl mb-2">{medals[idx]}</div>
                      <div className="font-display text-xl">{row.team.name}</div>
                      <div className="font-mono-stat text-3xl text-accent mt-1">{row.avg.toFixed(1)}</div>
                      <div className={`${heights[idx]} w-full mt-3 rounded-t-2xl border-t-4 ${order === 0 ? "border-accent bg-accent/15" : "border-primary-glow bg-primary/30"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Topper card */}
          <div className="rounded-3xl border border-accent/40 bg-gradient-card p-8 shadow-gold relative overflow-hidden">
            <div className="absolute -top-10 -right-10 size-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-2 flex items-center gap-2">
              <Flame className="size-4" /> Topper of the day
            </div>
            <div className="size-20 rounded-2xl bg-gradient-gold grid place-items-center font-display text-3xl text-accent-foreground mt-4 shadow-gold">
              {topper.student.avatar}
            </div>
            <div className="mt-4 font-display text-3xl">{topper.student.name}</div>
            <div className="text-sm text-muted-foreground">{topper.team.name} · {topper.student.branch}</div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-mono-stat text-6xl text-accent">{topper.marks}</span>
              <span className="text-muted-foreground">/ {latestExam.totalMarks}</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-xs font-bold tracking-wider uppercase">
              <Sparkles className="size-3" /> Rank #1
            </div>
          </div>
        </section>

        {/* Engagement: momentum & captain & winner */}
        <section className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Momentum / Biggest climber */}
          <div className="group rounded-2xl border border-primary/30 bg-gradient-card p-6 relative overflow-hidden transition-smooth hover:-translate-y-0.5 hover:shadow-elegant">
            <div
              aria-hidden
              className="absolute -top-10 -right-10 size-32 rounded-full blur-3xl opacity-50"
              style={{ background: `hsl(${climber.team.color} / 0.45)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary-glow font-bold">
                <Rocket className="size-3" /> Team Momentum
              </div>
              <div className="font-display text-3xl mt-3" style={{ color: `hsl(${climber.team.color})` }}>
                {climber.team.name}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {climber.rankDelta > 0
                  ? `Climbed ${climber.rankDelta} position${climber.rankDelta > 1 ? "s" : ""} this exam`
                  : climber.rankDelta < 0
                  ? `Slipped ${Math.abs(climber.rankDelta)} position${Math.abs(climber.rankDelta) > 1 ? "s" : ""}`
                  : "Holding the line"}
              </div>
              {climber.rankDelta > 0 && (
                <div className="mt-3 inline-flex items-center gap-1 text-success text-xs font-bold">
                  <TrendingUp className="size-3" /> +{climber.rankDelta}
                </div>
              )}
            </div>
          </div>

          {/* Most Improved Team (avg delta) */}
          <div className="rounded-2xl border border-border bg-gradient-card p-6 transition-smooth hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
              <Zap className="size-3" /> Most Improved
            </div>
            <div className="font-display text-3xl mt-3 text-foreground">{mostImproved.team.name}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {mostImproved.avgDelta >= 0 ? "+" : ""}
              {mostImproved.avgDelta.toFixed(1)} pts vs last exam
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-gold"
                style={{ width: `${Math.min(100, Math.max(0, 50 + mostImproved.avgDelta * 4))}%` }}
              />
            </div>
          </div>

          {/* Captain Performance */}
          <div className="rounded-2xl border border-accent/30 bg-gradient-card p-6 transition-smooth hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
              <Crown className="size-3" /> Captain Watch
            </div>
            <div className="font-display text-2xl mt-3 text-foreground truncate">{captainStudent.name}</div>
            <div className="text-xs text-muted-foreground">{winner.team.name} · Captain</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono-stat text-3xl text-accent">{captainRow?.marks ?? 0}</span>
              <span className="text-xs text-muted-foreground">/ {latestExam.totalMarks}</span>
              <span className="ml-auto text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                #{captainRow?.rank ?? "—"}
              </span>
            </div>
          </div>

          {/* Weekly Winner */}
          <div className="rounded-2xl border border-accent/40 bg-gradient-gold/10 p-6 transition-smooth hover:-translate-y-0.5 relative overflow-hidden">
            <div aria-hidden className="absolute -bottom-12 -right-12 size-32 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
                <Trophy className="size-3" /> Weekly Winner
              </div>
              <div className="font-display text-3xl mt-3 text-foreground">{winner.team.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {ilb.slice(0, 10).filter(r => r.team.id === winner.team.id).length} in top 10 · avg{" "}
                <span className="text-accent font-mono-stat">{winner.avg.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick context strip */}
        <section className="mt-6 rounded-2xl border border-border bg-gradient-card p-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <span className="text-muted-foreground">Topper belongs to</span>
            <span className="font-bold">{topper.team.name}</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary-glow" />
            <span className="text-muted-foreground">Attempted by</span>
            <span className="font-bold">{students.length} students</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {latestExam.subject} · {new Date(latestExam.date).toDateString()}
            </span>
          </div>
        </section>

        {user?.role === "student" && <MyScoresPanel />}
      </div>
    </div>
  );
};

export default Dashboard;
