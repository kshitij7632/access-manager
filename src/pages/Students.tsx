import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppState } from "@/context/AppStateContext";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { StudentImportDialog } from "@/components/StudentImportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const Students = () => {
  const { students, getTeam, studentOverall, individualLeaderboard, latestExamId, refresh: refreshAppState, error: appError } = useAppState();
  const { user, adminCreateUser, authError } = useAuth();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [rollNo, setRollNo] = useState("");

  const displayError = appError || authError;

  const canAdd = user?.role === "super_admin" || user?.role === "staff";
  const ilb = latestExamId ? individualLeaderboard(latestExamId) : [];
  const rankFor = (id: string) => ilb.find(r => r.student.id === id)?.rank ?? 0;

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminCreateUser({
      name,
      email,
      password: password || "student123",
      role: "student",
      studentClass,
      rollNo,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not create student");
      return;
    }
    await refreshAppState();
    toast.success("Student created successfully", { description: `${res.user?.name} (${res.user?.email})` });
    setName(""); setEmail(""); setPassword(""); setStudentClass(""); setRollNo("");
    setAddOpen(false);
  };

  const filtered = students.filter(s =>
    (s.name || "").toLowerCase().includes(q.toLowerCase()) ||
    (s.branch || "").toLowerCase().includes(q.toLowerCase()) ||
    (s.batch || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      {displayError && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-3 text-sm font-semibold">
          <AlertTriangle className="size-5 flex-shrink-0" />
          <div>
            <div className="font-bold">Failed to load data</div>
            <div className="text-xs opacity-90">{displayError}</div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <PageHeader
          eyebrow="Roster"
          title="Students"
          description="Every player. Every stat. Search by name, branch or batch."
        />
        {canAdd && (
          <div className="flex items-center gap-2">
            <StudentImportDialog onSuccess={refreshAppState} />
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
                  <UserPlus className="size-4 mr-2" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Student Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div>
                    <Label htmlFor="st-name">Full Name</Label>
                    <Input id="st-name" value={name} onChange={e => setName(e.target.value)} required maxLength={60} placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div>
                    <Label htmlFor="st-email">Email Address</Label>
                    <Input id="st-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={120} placeholder="rahul@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="st-password">Password (optional, default: student123)</Label>
                    <Input id="st-password" type="text" value={password} onChange={e => setPassword(e.target.value)} minLength={6} maxLength={60} placeholder="student123" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="st-class">Class / Section</Label>
                      <Input id="st-class" value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="e.g. 10-A" maxLength={30} />
                    </div>
                    <div>
                      <Label htmlFor="st-roll">Roll No.</Label>
                      <Input id="st-roll" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="e.g. 23" maxLength={20} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-gradient-gold text-accent-foreground font-bold">Create Account</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

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
                  <div className="text-xs text-muted-foreground md:hidden truncate">{team.name} · {s.branch} · Rank #{rank}</div>
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
