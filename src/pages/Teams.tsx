import { PageHeader } from "@/components/PageHeader";
import { teams, students, teamLeaderboard, getStudent } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Plus, Crown } from "lucide-react";
import { toast } from "sonner";

const Teams = () => {
  const tlb = teamLeaderboard();

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Squads"
        title="Teams"
        description="Form rosters, name a captain, march to the podium together."
        action={
          <Button size="lg" onClick={() => toast.success("Team builder coming soon")} className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
            <Plus className="size-4 mr-1" /> New Team
          </Button>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        {teams.map(team => {
          const row = tlb.find(t => t.team.id === team.id)!;
          const members = students.filter(s => s.teamId === team.id);
          const captain = getStudent(team.captainId);
          return (
            <div key={team.id} className="rounded-3xl border border-border bg-gradient-card overflow-hidden shadow-card">
              <div
                className="p-6 relative"
                style={{ background: `linear-gradient(135deg, hsl(${team.color} / 0.35), transparent 70%)` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: `hsl(${team.color})` }}>Rank #{row.rank}</div>
                    <h3 className="font-display text-4xl mt-1">{team.name}</h3>
                    <div className="text-sm text-muted-foreground italic mt-1">"{team.motto}"</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg</div>
                    <div className="font-mono-stat text-4xl text-accent">{row.avg.toFixed(1)}</div>
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 border border-border text-xs">
                  <Crown className="size-3 text-accent" /> Captain · <span className="font-semibold">{captain.name}</span>
                </div>
              </div>

              <div className="p-6 border-t border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Roster · {members.length}</div>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
                      <span className="size-6 rounded-full bg-gradient-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{m.avatar}</span>
                      {m.name.split(" ")[0]}
                      {m.id === team.captainId && <Crown className="size-3 text-accent" />}
                    </div>
                  ))}
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
