import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";

export const LiveTicker = () => {
  const { exams, marks, teamLeaderboard, individualLeaderboard } = useAppState();

  const messages = useMemo(() => {
    // Filter to exams that actually have uploaded marks
    const examsWithMarks = exams.filter(e => marks.some(m => m.examId === e.id));
    if (examsWithMarks.length === 0) return [];

    const resultMessages: string[] = [];

    // Process up to the 3 most recent exams with marks
    const recentExams = [...examsWithMarks]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    recentExams.forEach((exam) => {
      const tlb = teamLeaderboard(exam.id);
      const ilb = individualLeaderboard(exam.id);

      if (tlb.length > 0) {
        const winner = tlb[0];
        const runnerUp = tlb[1];
        const diff = runnerUp ? (winner.avg - runnerUp.avg).toFixed(1) : "0";
        resultMessages.push(`🏆 Team ${winner.team.name} leads ${exam.name} by ${diff} pts`);
      }

      if (ilb.length > 0) {
        const topper = ilb[0];
        resultMessages.push(`🔥 ${topper.student.name} scored highest in ${exam.name}: ${topper.marks}/${exam.totalMarks}`);
      }

      if (tlb.length > 1) {
        const teamRank2 = tlb[1];
        resultMessages.push(`⚡ ${teamRank2.team.name} climbed to Rank #${teamRank2.rank}`);
      }

      if (ilb.length > 1) {
        const top10Student = ilb[Math.min(1, ilb.length - 1)];
        resultMessages.push(`🎯 ${top10Student.student.name} entered the Top 10`);
      }

      if (ilb.length > 0) {
        const totalExamMarks = ilb.reduce((sum, r) => sum + r.marks, 0);
        const avgScore = (totalExamMarks / ilb.length).toFixed(1);
        resultMessages.push(`📈 Average score for ${exam.name}: ${avgScore}`);
      }
    });

    return resultMessages;
  }, [exams, marks, teamLeaderboard, individualLeaderboard]);

  if (messages.length === 0) {
    return (
      <div className="relative overflow-hidden bg-accent text-accent-foreground border-y border-accent-glow/40">
        <div className="absolute left-0 top-0 bottom-0 z-10 px-3 flex items-center gap-2 bg-foreground text-background font-display text-sm tracking-widest">
          <Flame className="size-4" /> LIVE
        </div>
        <div className="py-2 pl-24 pr-6 text-sm font-semibold tracking-wide">
          Upload results to start the live arena.
        </div>
      </div>
    );
  }

  const loop = [...messages, ...messages];

  return (
    <div className="relative overflow-hidden bg-accent text-accent-foreground border-y border-accent-glow/40">
      <div className="absolute left-0 top-0 bottom-0 z-10 px-3 flex items-center gap-2 bg-foreground text-background font-display text-sm tracking-widest">
        <Flame className="size-4" /> LIVE
      </div>
      <div className="ticker flex whitespace-nowrap py-2 pl-24">
        {loop.map((t, i) => (
          <span key={i} className="px-8 text-sm font-semibold tracking-wide">
            {t} <span className="opacity-40 mx-2">•</span>
          </span>
        ))}
      </div>
    </div>
  );
};
