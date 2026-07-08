import {
  createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Exam, Mark, Student, Team } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import { useAudit } from "@/context/AuditContext";
import { useNotifications } from "@/context/NotificationsContext";

const FALLBACK_TEAM_COLORS = ["226 90% 55%", "48 100% 55%", "12 85% 58%", "280 70% 60%", "160 70% 45%", "340 80% 60%"];

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";

type AppStateValue = {
  loading: boolean;
  teams: Team[];
  students: Student[];
  exams: Exam[];
  marks: Mark[];
  latestExamId: string;
  getTeam: (id: string) => Team;
  getStudent: (id: string) => Student;
  studentTotalForExam: (studentId: string, examId: string) => number;
  studentOverall: (studentId: string) => { total: number; max: number; pct: number };
  individualLeaderboard: (examId: string) => IndividualRow[];
  teamLeaderboard: (examId: string) => TeamRow[];
  addExam: (e: Omit<Exam, "id">) => Promise<Exam | null>;
  upsertMarks: (examId: string, entries: { studentId: string; marks: number }[]) => Promise<void>;
};

type IndividualRow = { student: Student; team: Team; marks: number; rank: number };
type TeamRow = {
  team: Team;
  members: Student[];
  avg: number;
  topPerformer: { m: Student; marks: number } | undefined;
  rank: number;
};

const AppStateContext = createContext<AppStateValue | null>(null);

const EMPTY_TEAM: Team = { id: "__none__", name: "Unassigned", color: "220 10% 40%", captainId: "", motto: "" };
const EMPTY_STUDENT: Student = { id: "__none__", name: "Unknown", batch: "—", branch: "—", teamId: EMPTY_TEAM.id, avatar: "?" };

function buildIndividual(examId: string, marks: Mark[], students: Student[], teamById: Map<string, Team>): IndividualRow[] {
  return students
    .map(s => ({
      student: s,
      team: teamById.get(s.teamId) ?? EMPTY_TEAM,
      marks: marks.find(m => m.studentId === s.id && m.examId === examId)?.marks ?? 0,
    }))
    .sort((a, b) => b.marks - a.marks)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function buildTeam(examId: string, marks: Mark[], teams: Team[], students: Student[]): TeamRow[] {
  return teams
    .map(team => {
      const members = students.filter(s => s.teamId === team.id);
      const scored = members.map(m => ({
        m,
        marks: marks.find(x => x.studentId === m.id && x.examId === examId)?.marks ?? 0,
      }));
      const avg = scored.reduce((a, b) => a + b.marks, 0) / Math.max(members.length, 1);
      const top = [...scored].sort((a, b) => b.marks - a.marks)[0];
      return { team, members, avg, topPerformer: top };
    })
    .sort((a, b) => b.avg - a.avg)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { log: auditLog } = useAudit();
  const { push: pushNotif } = useNotifications();

  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);

  const prevRanksRef = useRef<Record<string, Record<string, number>>>({});

  const loadAll = useCallback(async () => {
    // Fire in parallel; tolerate any single failure.
    const [teamsRes, teamMembersRes, profilesRes, examsRes, marksRes] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("team_members").select("team_id, user_id"),
      supabase.from("profiles").select("id, name, email, student_class, roll_no"),
      supabase.from("exams").select("*").order("date", { ascending: true }),
      supabase.from("marks").select("exam_id, student_id, marks"),
    ]);

    const teamRows = (teamsRes.data ?? []) as any[];
    const memberRows = (teamMembersRes.data ?? []) as any[];
    const profileRows = (profilesRes.data ?? []) as any[];
    const examRows = (examsRes.data ?? []) as any[];
    const markRows = (marksRes.data ?? []) as any[];

    const teamById = new Map<string, Team>();
    teamRows.forEach((t, i) => {
      const team: Team = {
        id: t.id,
        name: t.name ?? "Team",
        color: t.color ?? FALLBACK_TEAM_COLORS[i % FALLBACK_TEAM_COLORS.length],
        captainId: t.captain_id ?? "",
        motto: t.motto ?? "",
      };
      teamById.set(team.id, team);
    });

    const teamOf = new Map<string, string>();
    memberRows.forEach(r => { teamOf.set(r.user_id, r.team_id); });

    const nextStudents: Student[] = profileRows.map(p => ({
      id: p.id,
      name: p.name ?? p.email ?? "Student",
      batch: p.batch ?? "—",
      branch: p.branch ?? p.student_class ?? "—",
      teamId: teamOf.get(p.id) ?? EMPTY_TEAM.id,
      avatar: initialsOf(p.name ?? p.email ?? "S"),
    }));

    const nextExams: Exam[] = examRows.map(e => ({
      id: e.id,
      name: e.name,
      subject: e.subject ?? "",
      date: e.date,
      totalMarks: e.total_marks ?? e.totalMarks ?? 100,
    }));

    const nextMarks: Mark[] = markRows.map(m => ({
      studentId: m.student_id,
      examId: m.exam_id,
      marks: Number(m.marks) || 0,
    }));

    setTeams(Array.from(teamById.values()));
    setStudents(nextStudents);
    setExams(nextExams);
    setMarks(nextMarks);

    // Seed rank snapshots per exam so future upserts can diff rank movements.
    const initRanks: Record<string, Record<string, number>> = {};
    nextExams.forEach(e => {
      const lb = buildIndividual(e.id, nextMarks, nextStudents, teamById);
      initRanks[e.id] = Object.fromEntries(lb.map(r => [r.student.id, r.rank]));
    });
    prevRanksRef.current = initRanks;

    setLoading(false);
  }, []);

  useEffect(() => {
    // Only load once we know the auth state (avoid a wasted anon call on hard refresh).
    if (!user) { setLoading(false); return; }
    setLoading(true);
    void loadAll();

    // Realtime — reload on any change to core tables. Simple & robust.
    const channel = supabase
      .channel("app-state-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marks" }, () => { void loadAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, () => { void loadAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => { void loadAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => { void loadAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { void loadAll(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAll]);

  const teamById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const studentById = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  const latestExamId = useMemo(() => {
    if (exams.length === 0) return "";
    return [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-1)[0].id;
  }, [exams]);

  const value = useMemo<AppStateValue>(() => ({
    loading,
    teams,
    students,
    exams,
    marks,
    latestExamId,
    getTeam: (id) => teamById.get(id) ?? EMPTY_TEAM,
    getStudent: (id) => studentById.get(id) ?? EMPTY_STUDENT,
    studentTotalForExam: (studentId, examId) =>
      marks.find(m => m.studentId === studentId && m.examId === examId)?.marks ?? 0,
    studentOverall: (studentId) => {
      const ms = marks.filter(m => m.studentId === studentId);
      const total = ms.reduce((a, b) => a + b.marks, 0);
      const max = ms.reduce((a, b) => a + (exams.find(e => e.id === b.examId)?.totalMarks ?? 0), 0);
      return { total, max, pct: max ? (total / max) * 100 : 0 };
    },
    individualLeaderboard: (examId) => buildIndividual(examId, marks, students, teamById),
    teamLeaderboard: (examId) => buildTeam(examId, marks, teams, students),

    addExam: async (e) => {
      const { data, error } = await supabase
        .from("exams")
        .insert({ name: e.name, subject: e.subject, date: e.date, total_marks: e.totalMarks })
        .select()
        .single();
      if (error || !data) {
        console.error("addExam failed", error);
        return null;
      }
      const created: Exam = {
        id: (data as any).id,
        name: (data as any).name,
        subject: (data as any).subject ?? "",
        date: (data as any).date,
        totalMarks: (data as any).total_marks ?? e.totalMarks,
      };
      setExams(prev => [...prev, created]);
      auditLog({
        action: "exam.create",
        actorId: user?.id, actorName: user?.name, actorRole: user?.role,
        targetId: created.id, targetLabel: created.name,
        detail: `${created.subject} · ${created.totalMarks} pts`,
      });
      pushNotif({
        kind: "exam",
        title: `New exam: ${created.name}`,
        body: `${created.subject} · ${new Date(created.date).toDateString()}`,
        audience: "all",
      });
      return created;
    },

    upsertMarks: async (examId, entries) => {
      const rows = entries.map(en => ({ exam_id: examId, student_id: en.studentId, marks: en.marks }));
      const { error } = await supabase.from("marks").upsert(rows, { onConflict: "exam_id,student_id" });
      if (error) {
        console.error("upsertMarks failed", error);
        return;
      }

      // Optimistic local merge + notifications.
      const merged = (() => {
        const others = marks.filter(m => m.examId !== examId || !entries.find(e => e.studentId === m.studentId));
        const next = entries.map(e => ({ examId, studentId: e.studentId, marks: e.marks }));
        return [...others, ...next];
      })();
      setMarks(merged);

      const newLb = buildIndividual(examId, merged, students, teamById);
      const prev = prevRanksRef.current[examId] ?? {};
      const newRanks: Record<string, number> = {};
      newLb.forEach(r => { newRanks[r.student.id] = r.rank; });
      prevRanksRef.current = { ...prevRanksRef.current, [examId]: newRanks };

      const examName = exams.find(x => x.id === examId)?.name ?? "exam";
      pushNotif({
        kind: "marks",
        title: `Marks published: ${examName}`,
        body: `${entries.length} students scored`,
        audience: "all",
      });
      entries.forEach(en => {
        const before = prev[en.studentId];
        const after = newRanks[en.studentId];
        if (after && before && after !== before) {
          const moved = before - after;
          pushNotif({
            kind: "rank",
            title: moved > 0 ? `You moved up to rank #${after}` : `Your rank changed to #${after}`,
            body: `${examName} · was #${before}`,
            audience: { userId: en.studentId },
          });
        }
      });

      auditLog({
        action: "marks.upload",
        actorId: user?.id, actorName: user?.name, actorRole: user?.role,
        targetId: examId, targetLabel: examName,
        detail: `${entries.length} entries`,
      });
    },
  }), [loading, teams, students, exams, marks, teamById, studentById, latestExamId, user, auditLog, pushNotif]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be inside AppStateProvider");
  return ctx;
};
