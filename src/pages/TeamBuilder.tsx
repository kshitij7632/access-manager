import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { students as mockStudents } from "@/data/mock";
import { Search, ChevronRight, ChevronLeft, Plus, Trash2, Users as UsersIcon, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DemoStudent = {
  id: string;
  name: string;
  standard: string; // class
  branch: string;
  batch: string;
  rollNo: string;
};

// Build a richer demo pool from existing mock data, layering "standard" (class) on top.
const STANDARDS = ["Class 11", "Class 12", "Dropper"];
const demoStudents: DemoStudent[] = mockStudents.map((s, i) => ({
  id: s.id,
  name: s.name,
  standard: STANDARDS[i % STANDARDS.length],
  branch: s.branch,
  batch: s.batch,
  rollNo: `R${String(i + 1).padStart(3, "0")}`,
}));

const ALL_BRANCHES = Array.from(new Set(demoStudents.map((s) => s.branch)));

type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

const newTeam = (n: number): Team => ({
  id: `team-${Date.now()}-${n}`,
  name: `Team ${String.fromCharCode(64 + n)}`,
  memberIds: [],
});

const TeamBuilder = () => {
  const [standard, setStandard] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showDisabled, setShowDisabled] = useState(true); // show selected as disabled instead of hiding

  const [teams, setTeams] = useState<Team[]>([newTeam(1)]);
  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0].id);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];

  // Set of all student IDs already taken across ALL teams
  const takenIds = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.memberIds.forEach((id) => s.add(id)));
    return s;
  }, [teams]);

  // Filtered pool by standard / branch / search
  const filteredPool = useMemo(() => {
    return demoStudents.filter((s) => {
      if (standard !== "all" && s.standard !== standard) return false;
      if (branch !== "all" && s.branch !== branch) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase()) && !s.rollNo.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [standard, branch, query]);

  // Available list = filtered minus taken (or include taken as disabled if toggled)
  const availableList = useMemo(() => {
    if (showDisabled) return filteredPool;
    return filteredPool.filter((s) => !takenIds.has(s.id));
  }, [filteredPool, takenIds, showDisabled]);

  const teamMembers = useMemo(
    () => activeTeam.memberIds.map((id) => demoStudents.find((s) => s.id === id)!).filter(Boolean),
    [activeTeam],
  );

  const addToTeam = (id: string) => {
    if (takenIds.has(id)) {
      toast.error("Student already in another team");
      return;
    }
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, memberIds: [...t.memberIds, id] } : t)));
  };

  const removeFromTeam = (id: string) => {
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, memberIds: t.memberIds.filter((m) => m !== id) } : t)));
  };

  const addTeam = () => {
    const t = newTeam(teams.length + 1);
    setTeams((prev) => [...prev, t]);
    setActiveTeamId(t.id);
  };

  const deleteTeam = (id: string) => {
    if (teams.length === 1) {
      toast.error("Keep at least one team");
      return;
    }
    const next = teams.filter((t) => t.id !== id);
    setTeams(next);
    if (activeTeamId === id) setActiveTeamId(next[0].id);
  };

  const renameTeam = (name: string) => {
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, name } : t)));
  };

  const remaining = filteredPool.filter((s) => !takenIds.has(s.id)).length;

  // Drag and drop
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };
  const onDropToTeam = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) addToTeam(id);
  };
  const onDropToPool = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && activeTeam.memberIds.includes(id)) removeFromTeam(id);
  };

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Smart builder"
        title="Team Creation"
        description="Filter the roster, pick your roster, lock in your squad. No student gets drafted twice."
        action={
          <Button
            size="lg"
            onClick={() => toast.success(`Saved ${teams.length} team(s) · ${takenIds.size} students drafted`)}
            className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold"
          >
            <Sparkles className="size-4 mr-1" /> Finalize Draft
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-gradient-card p-4 md:p-5 mb-6 grid gap-4 md:grid-cols-[1fr,1fr,2fr,auto] items-end">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Standard</Label>
          <Select value={standard} onValueChange={setStandard}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              {STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {ALL_BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or roll no…" className="pl-10 bg-background" />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="disabled-toggle" checked={showDisabled} onCheckedChange={setShowDisabled} />
          <Label htmlFor="disabled-toggle" className="text-xs text-muted-foreground">Show taken as disabled</Label>
        </div>
      </div>

      {/* Team tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {teams.map((t) => {
          const active = t.id === activeTeamId;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTeamId(t.id)}
              className={cn(
                "group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-smooth border",
                active
                  ? "bg-gradient-primary text-primary-foreground border-transparent shadow-elegant"
                  : "bg-card text-foreground/80 border-border hover:bg-secondary",
              )}
            >
              <UsersIcon className="size-3.5" />
              {t.name}
              <span className={cn("font-mono-stat text-xs px-1.5 py-0.5 rounded", active ? "bg-background/20" : "bg-secondary text-accent")}>
                {t.memberIds.length}
              </span>
              {teams.length > 1 && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }}
                  className="ml-1 opacity-60 hover:opacity-100"
                  aria-label="Delete team"
                >
                  <Trash2 className="size-3.5" />
                </span>
              )}
            </button>
          );
        })}
        <Button variant="outline" size="sm" onClick={addTeam} className="rounded-full">
          <Plus className="size-4 mr-1" /> New Team
        </Button>
      </div>

      {/* Dual panel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available pool */}
        <div
          className="rounded-2xl border border-border bg-gradient-card overflow-hidden flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropToPool}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/40">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Available Students</div>
              <div className="font-display text-2xl mt-0.5">Pool</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Remaining</div>
              <div className="font-mono-stat text-3xl text-primary">{remaining}</div>
            </div>
          </div>
          <ScrollArea className="h-[460px]">
            <div className="p-3 space-y-2">
              {availableList.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-sm">No students match the filters.</div>
              )}
              {availableList.map((s) => {
                const taken = takenIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    draggable={!taken}
                    onDragStart={(e) => !taken && onDragStart(e, s.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-smooth",
                      taken
                        ? "border-dashed border-border/60 bg-background/30 opacity-50 cursor-not-allowed"
                        : "border-border bg-background/60 hover:border-primary hover:shadow-elegant cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center font-bold text-xs shrink-0">
                      {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-sm flex items-center gap-2">
                        {s.name}
                        {taken && <span className="text-[10px] uppercase tracking-widest text-accent">Drafted</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.rollNo} · {s.standard} · {s.branch}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={taken ? "ghost" : "default"}
                      disabled={taken}
                      onClick={() => addToTeam(s.id)}
                      className={cn(!taken && "bg-gradient-primary text-primary-foreground hover:opacity-90")}
                    >
                      Add <ChevronRight className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Selected / team panel */}
        <div
          className="rounded-2xl border border-border bg-gradient-card overflow-hidden flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropToTeam}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/40 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Team Roster</div>
              <Input
                value={activeTeam.name}
                onChange={(e) => renameTeam(e.target.value)}
                className="mt-1 bg-transparent border-0 px-0 font-display text-2xl h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected</div>
              <div className="font-mono-stat text-3xl text-accent">{teamMembers.length}</div>
            </div>
          </div>
          <ScrollArea className="h-[460px]">
            <div className="p-3 space-y-2">
              {teamMembers.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-sm">
                  Drag players here, or hit <span className="text-foreground font-semibold">Add</span> on the left.
                </div>
              )}
              {teamMembers.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, s.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-accent/40 bg-accent/5 hover:bg-accent/10 transition-smooth cursor-grab active:cursor-grabbing"
                >
                  <div className="size-10 rounded-xl bg-gradient-gold text-accent-foreground grid place-items-center font-bold text-xs shrink-0">
                    <Check className="size-4" strokeWidth={3} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.rollNo} · {s.standard} · {s.branch}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFromTeam(s.id)}>
                    <ChevronLeft className="size-4" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Live counters footer */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Active Team</div>
          <div className="font-display text-3xl mt-1">{activeTeam.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{teamMembers.length} member(s)</div>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Drafted</div>
          <div className="font-display text-3xl mt-1 text-primary">{takenIds.size}</div>
          <div className="text-xs text-muted-foreground mt-1">across {teams.length} team(s)</div>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Remaining (filtered)</div>
          <div className="font-display text-3xl mt-1 text-accent">{remaining}</div>
          <div className="text-xs text-muted-foreground mt-1">match current filters</div>
        </div>
      </div>
    </div>
  );
};

export default TeamBuilder;
