import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppState } from "@/context/AppStateContext";
import {
  Search, ChevronRight, ChevronLeft, Plus, Trash2, Users as UsersIcon,
  Sparkles, Check, Star, Crown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAudit } from "@/context/AuditContext";
import { cn } from "@/lib/utils";

type DemoStudent = {
  id: string;
  name: string;
  standard: string;
  branch: string;
  batch: string;
  rollNo: string;
};

const STANDARDS = ["Class 11", "Class 12", "Dropper"];
// demoStudents & ALL_BRANCHES are now computed inside the component from live data.

// Color palette for team tags (HSL strings, design-token friendly)
const TEAM_COLORS = [
  "226 90% 55%", // cobalt
  "48 100% 55%", // gold
  "12 85% 58%",  // orange-red
  "280 70% 60%", // purple
  "160 70% 45%", // teal
  "340 80% 60%", // pink
];

type Team = {
  id: string;
  name: string;
  color: string;
  captainId: string | null;
  memberIds: string[];
};

let teamCounter = 0;
const newTeam = (n: number): Team => {
  teamCounter += 1;
  return {
    id: `team-${Date.now()}-${teamCounter}`,
    name: `Team ${String.fromCharCode(64 + n)}`,
    color: TEAM_COLORS[(n - 1) % TEAM_COLORS.length],
    captainId: null,
    memberIds: [],
  };
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const TeamBuilder = () => {
  const { students: liveStudents } = useAppState();
  const demoStudents: DemoStudent[] = useMemo(() => liveStudents.map((s, i) => ({
    id: s.id,
    name: s.name,
    standard: STANDARDS[i % STANDARDS.length],
    branch: s.branch,
    batch: s.batch,
    rollNo: `R${String(i + 1).padStart(3, "0")}`,
  })), [liveStudents]);
  const ALL_BRANCHES = useMemo(() => Array.from(new Set(demoStudents.map(s => s.branch))), [demoStudents]);

  const [standard, setStandard] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showDisabled, setShowDisabled] = useState(false);

  const [teams, setTeams] = useState<Team[]>([newTeam(1)]);
  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0].id);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];

  const takenMap = useMemo(() => {
    const m = new Map<string, Team>();
    teams.forEach((t) => t.memberIds.forEach((id) => m.set(id, t)));
    return m;
  }, [teams]);

  const filteredPool = useMemo(() => {
    return demoStudents.filter((s) => {
      if (standard !== "all" && s.standard !== standard) return false;
      if (branch !== "all" && s.branch !== branch) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.rollNo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [standard, branch, query]);

  const availableList = useMemo(() => {
    if (showDisabled) return filteredPool;
    return filteredPool.filter((s) => !takenMap.has(s.id));
  }, [filteredPool, takenMap, showDisabled]);

  const teamMembers = useMemo(
    () => (activeTeam?.memberIds ?? []).map((id) => demoStudents.find((s) => s.id === id)).filter(Boolean) as Student[],
    [activeTeam],
  );

  const addToTeam = (id: string) => {
    if (takenMap.has(id)) {
      toast.error(`Already in ${takenMap.get(id)?.name ?? "another team"}`);
      return;
    }
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, memberIds: [...t.memberIds, id] } : t)));
  };

  const removeFromTeam = (id: string, teamId: string = activeTeamId) => {
    setTeams((prev) => prev.map((t) => {
      if (t.id !== teamId) return t;
      const memberIds = t.memberIds.filter((m) => m !== id);
      const captainId = t.captainId === id ? null : t.captainId;
      return { ...t, memberIds, captainId };
    }));
  };

  const setCaptain = (id: string) => {
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, captainId: t.captainId === id ? null : id } : t)));
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
    const target = teams.find((t) => t.id === id);
    const next = teams.filter((t) => t.id !== id);
    setTeams(next);
    if (activeTeamId === id) setActiveTeamId(next[0].id);
    if (target) toast.success(`${target.name} deleted · ${target.memberIds.length} returned to pool`);
  };

  const renameTeam = (name: string) => {
    setTeams((prev) => prev.map((t) => (t.id === activeTeamId ? { ...t, name } : t)));
  };

  const cycleColor = () => {
    setTeams((prev) => prev.map((t) => {
      if (t.id !== activeTeamId) return t;
      const idx = TEAM_COLORS.indexOf(t.color);
      return { ...t, color: TEAM_COLORS[(idx + 1) % TEAM_COLORS.length] };
    }));
  };

  // Live summary uses full dataset (not filtered) for accurate totals
  const totalStudents = demoStudents.length;
  const assignedStudents = takenMap.size;
  const remainingStudents = totalStudents - assignedStudents;
  const remainingFiltered = filteredPool.filter((s) => !takenMap.has(s.id)).length;

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

  const { user } = useAuth();
  const { log: auditLog } = useAudit();
  const [saving, setSaving] = useState(false);

  const handleFinalize = async () => {
    setSaving(true);
    try {
      for (const t of teams) {
        const isTempId = t.id.startsWith("team-");
        const teamPayload = {
          name: t.name,
          color: t.color,
          captain_id: t.captainId || null,
          created_by: user?.id || null,
        };

        let teamId = t.id;
        if (isTempId) {
          const { data, error } = await supabase.from("teams").insert(teamPayload).select("id").single();
          if (error) throw error;
          teamId = data.id;
        } else {
          const { error } = await supabase.from("teams").update(teamPayload).eq("id", t.id);
          if (error) throw error;
        }

        // Sync team members
        await supabase.from("team_members").delete().eq("team_id", teamId);
        if (t.memberIds.length > 0) {
          const memberRows = t.memberIds.map(uid => ({ team_id: teamId, student_id: uid }));
          const { error: memErr } = await supabase.from("team_members").insert(memberRows);
          if (memErr) throw memErr;
        }
      }

      auditLog({
        action: "user.bulk_import",
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        detail: `Finalized draft for ${teams.length} teams (${assignedStudents} students assigned)`,
      });

      toast.success(`Saved ${teams.length} team(s) to Supabase`, {
        description: `${assignedStudents} students drafted & roster updated`,
      });
    } catch (err: any) {
      console.error("Failed to finalize team draft:", err);
      toast.error(err?.message || "Failed to save team draft to database");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Smart builder"
        title="Team Creation"
        description="Filter the roster, draft your squad, lock in captains. No student gets drafted twice."
        action={
          <Button
            size="lg"
            disabled={saving}
            onClick={handleFinalize}
            className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold"
          >
            <Sparkles className="size-4 mr-1" /> {saving ? "Saving…" : "Finalize Draft"}
          </Button>
        }
      />

      {/* Live Summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-border bg-gradient-card p-4 animate-fade-in">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Students</div>
          <div className="font-display text-4xl mt-1">{totalStudents}</div>
        </div>
        <div className="rounded-2xl border border-primary/40 bg-gradient-card p-4 animate-fade-in">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Assigned</div>
          <div className="font-display text-4xl mt-1 text-primary">{assignedStudents}</div>
          <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${(assignedStudents / totalStudents) * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-gradient-card p-4 animate-fade-in">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Remaining</div>
          <div className="font-display text-4xl mt-1 text-accent">{remainingStudents}</div>
          <div className="text-xs text-muted-foreground mt-1">{remainingFiltered} match current filters</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-gradient-card p-4 md:p-5 mb-6 grid gap-4 md:grid-cols-[1fr,1fr,2fr,auto] items-end">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Standard</Label>
          <Select value={standard || undefined} onValueChange={setStandard}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder="Select standard…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              {STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Branch</Label>
          <Select value={branch || undefined} onValueChange={setBranch}>
            <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder="Select branch…" /></SelectTrigger>
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
                  ? "text-primary-foreground border-transparent shadow-elegant"
                  : "bg-card text-foreground/80 border-border hover:bg-secondary",
              )}
              style={active ? { background: `linear-gradient(135deg, hsl(${t.color}), hsl(${t.color} / 0.7))` } : undefined}
            >
              <span className="size-2 rounded-full" style={{ background: `hsl(${t.color})` }} />
              {t.name}
              <span className={cn("font-mono text-xs px-1.5 py-0.5 rounded", active ? "bg-background/20" : "bg-secondary text-accent")}>
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
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Showing</div>
              <div className="font-mono text-3xl text-primary">{availableList.length}</div>
            </div>
          </div>
          <ScrollArea className="h-[460px]">
            <div className="p-3 space-y-2">
              {availableList.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-sm">No students match the filters.</div>
              )}
              {availableList.map((s) => {
                const ownerTeam = takenMap.get(s.id);
                const taken = !!ownerTeam;
                return (
                  <div
                    key={s.id}
                    draggable={!taken}
                    onDragStart={(e) => !taken && onDragStart(e, s.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-smooth animate-fade-in",
                      taken
                        ? "border-dashed border-border/60 bg-background/30 opacity-50 cursor-not-allowed"
                        : "border-border bg-background/60 hover:border-primary hover:shadow-elegant cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <div className="size-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center font-bold text-xs shrink-0">
                      {initials(s.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-sm flex items-center gap-2">
                        {s.name}
                        {taken && ownerTeam && (
                          <span
                            className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `hsl(${ownerTeam.color} / 0.2)`, color: `hsl(${ownerTeam.color})` }}
                          >
                            {ownerTeam.name}
                          </span>
                        )}
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

        {/* Active team panel */}
        <div
          className="rounded-2xl border-2 overflow-hidden flex flex-col bg-gradient-card transition-smooth"
          style={{ borderColor: `hsl(${activeTeam.color} / 0.5)` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropToTeam}
        >
          <div
            className="px-5 py-4 border-b border-border flex items-center justify-between gap-3"
            style={{ background: `linear-gradient(135deg, hsl(${activeTeam.color} / 0.15), transparent)` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Team Roster
                <button
                  onClick={cycleColor}
                  className="size-4 rounded-full ring-2 ring-background hover:scale-110 transition-transform"
                  style={{ background: `hsl(${activeTeam.color})` }}
                  title="Change team color"
                  aria-label="Change team color"
                />
              </div>
              <Input
                value={activeTeam.name}
                onChange={(e) => renameTeam(e.target.value)}
                className="mt-1 bg-transparent border-0 px-0 font-display text-2xl h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</div>
              <div className="font-mono text-3xl" style={{ color: `hsl(${activeTeam.color})` }}>{teamMembers.length}</div>
            </div>
          </div>
          <ScrollArea className="h-[460px]">
            <div className="p-3 space-y-2">
              {teamMembers.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-sm">
                  Drag players here, or hit <span className="text-foreground font-semibold">Add</span> on the left.
                </div>
              )}
              {teamMembers.map((s) => {
                const isCaptain = activeTeam.captainId === s.id;
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, s.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-smooth cursor-grab active:cursor-grabbing animate-scale-in",
                      isCaptain
                        ? "border-accent bg-accent/10 shadow-gold"
                        : "border-border bg-background/60 hover:border-primary",
                    )}
                  >
                    <div className={cn(
                      "size-10 rounded-xl grid place-items-center font-bold text-xs shrink-0 relative",
                      isCaptain
                        ? "bg-gradient-gold text-accent-foreground"
                        : "bg-gradient-primary text-primary-foreground",
                    )}>
                      {isCaptain ? <Crown className="size-4" /> : <Check className="size-4" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-sm flex items-center gap-1.5">
                        {s.name}
                        {isCaptain && (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Captain</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.rollNo} · {s.standard} · {s.branch}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCaptain(s.id)}
                      className={cn(isCaptain && "text-accent")}
                      title={isCaptain ? "Remove captain" : "Make captain"}
                    >
                      <Star className={cn("size-4", isCaptain && "fill-accent")} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeFromTeam(s.id)}>
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Created teams overview */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Overview</div>
            <h2 className="font-display text-3xl mt-1">All Teams</h2>
          </div>
          <div className="text-sm text-muted-foreground">{teams.length} team(s) · {assignedStudents} drafted</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const captain = t.captainId ? demoStudents.find((s) => s.id === t.captainId) : null;
            const members = (t.memberIds ?? []).map((id) => demoStudents.find((s) => s.id === id)).filter(Boolean) as Student[];
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border-2 bg-gradient-card p-5 transition-smooth hover:shadow-elegant cursor-pointer animate-fade-in",
                  t.id === activeTeamId && "ring-2 ring-offset-2 ring-offset-background",
                )}
                style={{
                  borderColor: `hsl(${t.color} / 0.4)`,
                  ...(t.id === activeTeamId ? { ["--tw-ring-color" as any]: `hsl(${t.color})` } : {}),
                }}
                onClick={() => setActiveTeamId(t.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ background: `hsl(${t.color})` }} />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        {t.id === activeTeamId ? "Editing" : "Team"}
                      </span>
                    </div>
                    <div className="font-display text-2xl mt-1 truncate">{t.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-3xl" style={{ color: `hsl(${t.color})` }}>{members.length}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Captain</div>
                  {captain ? (
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-gradient-gold text-accent-foreground grid place-items-center font-bold text-[10px]">
                        <Crown className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{captain.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{captain.rollNo}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No captain assigned</div>
                  )}
                </div>

                {members.length > 0 && (
                  <div className="mt-4 flex -space-x-2">
                    {members.slice(0, 6).map((m) => (
                      <div
                        key={m.id}
                        className="size-7 rounded-full bg-secondary border-2 border-card grid place-items-center text-[10px] font-bold"
                        title={m.name}
                      >
                        {initials(m.name)}
                      </div>
                    ))}
                    {members.length > 6 && (
                      <div className="size-7 rounded-full bg-primary text-primary-foreground border-2 border-card grid place-items-center text-[10px] font-bold">
                        +{members.length - 6}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); setActiveTeamId(t.id); }}
                  >
                    Edit
                  </Button>
                  {teams.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add new team card */}
          <button
            onClick={addTeam}
            className="rounded-2xl border-2 border-dashed border-border hover:border-primary bg-background/30 hover:bg-background/50 p-5 transition-smooth grid place-items-center min-h-[200px] group"
          >
            <div className="text-center">
              <div className="size-12 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center mx-auto group-hover:scale-110 transition-transform shadow-elegant">
                <Plus className="size-6" />
              </div>
              <div className="font-display text-xl mt-3">New Team</div>
              <div className="text-xs text-muted-foreground mt-1">Add another squad</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamBuilder;
