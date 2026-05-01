import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppState } from "@/context/AppStateContext";
import { students, getTeam } from "@/data/mock";
import { TrendingUp, Trophy, Target, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Personal scoreboard for the signed-in student. We resolve a "demo student"
 * mapping for accounts that aren't in the mock student roster so they still
 * see a meaningful view in this demo build.
 */
export const MyScoresPanel = () => {
  const { user } = useAuth();
  const { exams, marks, individualLeaderboard } = useAppState();

  const me = useMemo(() => {
    if (!user) return null;
    // Try exact email/name match against seed roster, else pick a deterministic demo slot
    const byName = students.find(s => s.name.toLowerCase() === user.name.toLowerCase());
    if (byName) return byName;
    const idx = Math.abs(hash(user.id)) % students.length;
    return students[idx];
  }, [user]);

  if (!user || !me) return null;
  const team = getTeam(me.teamId);

  const myMarks = exams
    .map(e => {
      const m = marks.find(mk => mk.studentId === me.id && mk.examId === e.id);
      return m ? { exam: e, marks: m.marks } : null;
    })
    .filter(Boolean) as { exam: typeof exams[number]; marks: number }[];

  const latest = myMarks[myMarks.length - 1];
  const latestLb = latest ? individualLeaderboard(latest.exam.id) : [];
  const myRow = latest ? latestLb.find(r => r.student.id === me.id) : null;
  const totalScored = myMarks.reduce((a, b) => a + b.marks, 0);
  const totalPossible = myMarks.reduce((a, b) => a + b.exam.totalMarks, 0);
  const pct = totalPossible ? (totalScored / totalPossible) * 100 : 0;

  const max = Math.max(...myMarks.map(m => (m.marks / m.exam.totalMarks) * 100), 1);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">For you</div>
          <h2 className="font-display text-3xl mt-1">My scores & rank</h2>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/leaderboard">Open full leaderboard →</Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-accent/40 bg-gradient-card p-6 shadow-gold relative overflow-hidden">
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-accent/15 blur-3xl" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
            <Trophy className="size-3.5 text-accent" /> Latest rank
          </div>
          <div className="font-mono-stat text-5xl text-accent mt-2">
            {myRow ? `#${myRow.rank}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {latest ? `${latest.exam.name} · ${latest.marks}/${latest.exam.totalMarks}` : "No exams yet"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
            <Target className="size-3.5" /> Overall
          </div>
          <div className="font-mono-stat text-5xl mt-2">{pct.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">{totalScored} / {totalPossible} pts</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
            <TrendingUp className="size-3.5" /> Team
          </div>
          <div className="font-display text-2xl mt-2">{team.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{me.branch} · {me.batch}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-4 text-accent" />
          <div className="font-display text-lg">Score trend</div>
        </div>
        {myMarks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No marks recorded yet.</div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {myMarks.map(({ exam, marks }) => {
              const p = (marks / exam.totalMarks) * 100;
              const h = (p / max) * 100;
              return (
                <div key={exam.id} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="w-full flex flex-col justify-end h-32">
                    <div
                      className="w-full rounded-t-md bg-gradient-gold shadow-gold"
                      style={{ height: `${Math.max(h, 4)}%` }}
                      title={`${marks} / ${exam.totalMarks}`}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center truncate w-full">{exam.name.replace("Mock Test ", "MT")}</div>
                  <div className="text-xs font-mono">{marks}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
