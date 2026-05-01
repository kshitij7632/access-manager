import { createContext, useContext, useState, ReactNode, useMemo, useRef, useEffect } from "react";
import {
  exams as seedExams,
  marks as seedMarks,
  students,
  teams,
  getTeam,
  Exam,
  Mark,
} from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import { useAudit } from "@/context/AuditContext";
import { useNotifications } from "@/context/NotificationsContext";

type AppStateValue = {
  exams: Exam[];
  marks: Mark[];
  addExam: (e: Omit<Exam, "id">) => Exam;
  upsertMarks: (examId: string, entries: { studentId: string; marks: number }[]) => void;
  // derived helpers (recompute against live state)
  individualLeaderboard: (examId: string) => ReturnType<typeof buildIndividual>;
  teamLeaderboard: (examId: string) => ReturnType<typeof buildTeam>;
};

function buildIndividual(examId: string, marks: Mark[]) {
  return students
    .map(s => ({
      student: s,
      team: getTeam(s.teamId),
      marks: marks.find(m => m.studentId === s.id && m.examId === examId)?.marks ?? 0,
    }))
    .sort((a, b) => b.marks - a.marks)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function buildTeam(examId: string, marks: Mark[]) {
  return teams
    .map(team => {
      const members = students.filter(s => s.teamId === team.id);
      const totals = members.map(m =>
        marks.find(x => x.studentId === m.id && x.examId === examId)?.marks ?? 0
      );
      const avg = totals.reduce((a, b) => a + b, 0) / Math.max(members.length, 1);
      const top = members
        .map(m => ({
          m,
          marks: marks.find(x => x.studentId === m.id && x.examId === examId)?.marks ?? 0,
        }))
        .sort((a, b) => b.marks - a.marks)[0];
      return { team, members, avg, topPerformer: top };
    })
    .sort((a, b) => b.avg - a.avg)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

const AppStateContext = createContext<AppStateValue | null>(null);

// Map our seed students (s1, s2 …) to potential AppUser ids by index, since
// student notifications need a target userId. We just use the seed id directly
// as a stable target — they're synthetic but unique.

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [exams, setExams] = useState<Exam[]>(seedExams);
  const [marks, setMarks] = useState<Mark[]>(seedMarks);
  const { user } = useAuth();
  const { log: auditLog } = useAudit();
  const { push: pushNotif } = useNotifications();

  // Track previous ranks per exam so we can detect rank movement on upserts
  const prevRanksRef = useRef<Record<string, Record<string, number>>>({});
  useEffect(() => {
    // initialize
    const init: Record<string, Record<string, number>> = {};
    seedExams.forEach(e => {
      const lb = buildIndividual(e.id, seedMarks);
      init[e.id] = Object.fromEntries(lb.map(r => [r.student.id, r.rank]));
    });
    prevRanksRef.current = init;
  }, []);

  const value = useMemo<AppStateValue>(() => ({
    exams,
    marks,
    addExam: (e) => {
      const created: Exam = { id: `e${Date.now()}`, ...e };
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
    upsertMarks: (examId, entries) => {
      setMarks(prev => {
        const others = prev.filter(m => m.examId !== examId || !entries.find(e => e.studentId === m.studentId));
        const next = entries.map(e => ({ examId, studentId: e.studentId, marks: e.marks }));
        const merged = [...others, ...next];

        // Compute new ranks for this exam and compare with previous
        const newLb = buildIndividual(examId, merged);
        const prev2 = prevRanksRef.current[examId] ?? {};
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
        // Rank-change notifications per affected student
        entries.forEach(en => {
          const before = prev2[en.studentId];
          const after = newRanks[en.studentId];
          if (after && before && after !== before) {
            const moved = before - after; // positive = moved up
            pushNotif({
              kind: "rank",
              title: moved > 0 ? `You moved up to rank #${after}` : `Your rank changed to #${after}`,
              body: `${examName} · was #${before}`,
              audience: { userId: en.studentId },
            });
          }
        });

        return merged;
      });
      auditLog({
        action: "marks.upload",
        actorId: user?.id, actorName: user?.name, actorRole: user?.role,
        targetId: examId, targetLabel: exams.find(e => e.id === examId)?.name,
        detail: `${entries.length} entries`,
      });
    },
    individualLeaderboard: (examId) => buildIndividual(examId, marks),
    teamLeaderboard: (examId) => buildTeam(examId, marks),
  }), [exams, marks, user, auditLog, pushNotif]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be inside AppStateProvider");
  return ctx;
};
