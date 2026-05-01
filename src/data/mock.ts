export type Student = {
  id: string;
  name: string;
  batch: string;
  branch: string;
  teamId: string;
  avatar: string;
};

export type Team = {
  id: string;
  name: string;
  color: string; // tailwind-friendly hsl
  captainId: string;
  motto: string;
};

export type Exam = {
  id: string;
  name: string;
  date: string; // ISO
  totalMarks: number;
  subject: string;
};

export type Mark = {
  studentId: string;
  examId: string;
  marks: number;
};

export const teams: Team[] = [
  { id: "t1", name: "Team Alpha",   color: "226 90% 55%", captainId: "s1",  motto: "Strike first, strike hard." },
  { id: "t2", name: "Team Nova",    color: "48 100% 55%", captainId: "s6",  motto: "Burn bright. Burn loud." },
  { id: "t3", name: "Team Titan",   color: "12 85% 58%",  captainId: "s11", motto: "Built different." },
  { id: "t4", name: "Team Phoenix", color: "280 70% 60%", captainId: "s16", motto: "Rise. Repeat." },
];

const firstNames = ["Aarav","Vihaan","Aditya","Arjun","Sai","Reyansh","Krishna","Ishaan","Ayaan","Rohan","Kabir","Ananya","Diya","Saanvi","Aadhya","Myra","Aarohi","Anika","Pari","Ira"];
const lastNames  = ["Sharma","Verma","Patel","Reddy","Khan","Iyer","Nair","Mehta","Singh","Gupta","Joshi","Bose","Rao","Kapoor","Bhat","Ghosh","Pillai","Shah","Das","Menon"];
const branches   = ["JEE Main","NEET","JEE Advanced","Foundation"];
const batches    = ["Morning","Evening","Weekend"];

function seedRand(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}
const rnd = seedRand(42);

export const students: Student[] = Array.from({ length: 20 }).map((_, i) => {
  const team = teams[i % teams.length];
  const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
  return {
    id: `s${i + 1}`,
    name,
    batch: batches[i % batches.length],
    branch: branches[i % branches.length],
    teamId: team.id,
    avatar: name.split(" ").map(p => p[0]).join("").toUpperCase(),
  };
});

export const exams: Exam[] = [
  { id: "e1", name: "Mock Test 01", subject: "Physics",   date: "2026-04-05", totalMarks: 100 },
  { id: "e2", name: "Mock Test 02", subject: "Chemistry", date: "2026-04-12", totalMarks: 100 },
  { id: "e3", name: "Mock Test 03", subject: "Maths",     date: "2026-04-19", totalMarks: 100 },
  { id: "e4", name: "Grand Test",   subject: "Full Syllabus", date: "2026-04-28", totalMarks: 200 },
];

export const marks: Mark[] = exams.flatMap(exam =>
  students.map(s => ({
    studentId: s.id,
    examId: exam.id,
    marks: Math.round(40 + rnd() * (exam.totalMarks - 45)),
  }))
);

export const latestExamId = "e4";

// Helpers
export const getTeam = (id: string) => teams.find(t => t.id === id)!;
export const getStudent = (id: string) => students.find(s => s.id === id)!;

export function studentTotalForExam(studentId: string, examId: string) {
  const m = marks.find(x => x.studentId === studentId && x.examId === examId);
  return m?.marks ?? 0;
}

export function studentOverall(studentId: string) {
  const ms = marks.filter(m => m.studentId === studentId);
  const total = ms.reduce((a, b) => a + b.marks, 0);
  const max = ms.reduce((a, b) => a + (exams.find(e => e.id === b.examId)?.totalMarks ?? 0), 0);
  return { total, max, pct: max ? (total / max) * 100 : 0 };
}

export function individualLeaderboard(examId: string = latestExamId) {
  return students
    .map(s => ({
      student: s,
      team: getTeam(s.teamId),
      marks: studentTotalForExam(s.id, examId),
    }))
    .sort((a, b) => b.marks - a.marks)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function teamLeaderboard(examId: string = latestExamId) {
  return teams
    .map(team => {
      const members = students.filter(s => s.teamId === team.id);
      const totals = members.map(m => studentTotalForExam(m.id, examId));
      const avg = totals.reduce((a, b) => a + b, 0) / Math.max(members.length, 1);
      const top = members
        .map(m => ({ m, marks: studentTotalForExam(m.id, examId) }))
        .sort((a, b) => b.marks - a.marks)[0];
      return { team, members, avg, topPerformer: top };
    })
    .sort((a, b) => b.avg - a.avg)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function topInTeamCount(teamId: string, examId: string, topN = 10) {
  const top = individualLeaderboard(examId).slice(0, topN);
  return top.filter(r => r.team.id === teamId).length;
}
