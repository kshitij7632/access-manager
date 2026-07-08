import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppState } from "@/context/AppStateContext";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Students = () => {
  const { students, getTeam, studentOverall, individualLeaderboard, latestExamId } = useAppState();
  const [q, setQ] = useState("");
  const ilb = latestExamId ? individualLeaderboard(latestExamId) : [];
  const rankFor = (id: string) => ilb.find(r => r.student.id === id)?.rank ?? 0;

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.branch.toLowerCase().includes(q.toLowerCase()) ||
    s.batch.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description="Every player. Every stat. Search by name, branch or batch."
      />

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students…" className="pl-10 bg-card border-border" />
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[60px,2fr,1fr,1fr,1fr,auto] gap-4 px-6 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border bg-background/40">
          <div>Rank</div><div>Name</div><div>Team</div><div>Branch</div><div>Batch</div><div className="text-right">Overall</div>
        </div>
        {filtered.map(s => {
          const team = getTeam(s.teamId);
          const overall = studentOverall(s.id);
          const rank = rankFor(s.id);
          return (
            <div key={s.id} className="grid grid-cols-[1fr,auto] md:grid-cols-[60px,2fr,1fr,1fr,1fr,auto] gap-4 items-center px-6 py-4 border-b border-border/50 last:border-0 transition-smooth hover:bg-secondary/40">
              <div className="hidden md:block font-mono-stat text-muted-foreground">#{rank}</div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center font-bold text-sm flex-shrink-0">{s.avatar}</div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{team.name} · Rank #{rank}</div>
                </div>
              </div>
              <div className="hidden md:block text-sm">{team.name}</div>
              <div className="hidden md:block text-sm text-muted-foreground">{s.branch}</div>
              <div className="hidden md:block text-sm text-muted-foreground">{s.batch}</div>
              <div className="text-right">
                <div className="font-mono-stat text-xl text-accent">{overall.pct.toFixed(0)}%</div>
                <div className="text-[10px] text-muted-foreground">{overall.total}/{overall.max}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground">No students match your search.</div>
        )}
      </div>
    </div>
  );
};

export default Students;
