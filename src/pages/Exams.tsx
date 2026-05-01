import { PageHeader } from "@/components/PageHeader";
import { students } from "@/data/mock";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { NewExamDialog } from "@/components/NewExamDialog";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Users, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const Exams = () => {
  const { exams, marks, individualLeaderboard } = useAppState();
  const { user } = useAuth();
  const canEdit = user?.role === "staff" || user?.role === "super_admin";

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Test Center"
        title="Exams"
        description="Schedule, conduct, upload marks. Every test is a new chapter on the leaderboard."
        action={canEdit ? <NewExamDialog /> : undefined}
      />

      <div className="grid md:grid-cols-2 gap-5">
        {exams.map(exam => {
          const examMarks = marks.filter(m => m.examId === exam.id);
          const avg = examMarks.reduce((a, b) => a + b.marks, 0) / Math.max(examMarks.length, 1);
          const top = individualLeaderboard(exam.id)[0];
          const hasScores = examMarks.some(m => m.marks > 0);
          return (
            <div key={exam.id} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card transition-smooth hover:-translate-y-0.5 hover:border-accent/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">{exam.subject}</div>
                  <h3 className="font-display text-3xl mt-1">{exam.name}</h3>
                </div>
                <div className="size-12 rounded-xl bg-secondary grid place-items-center">
                  <FileText className="size-5 text-accent" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Calendar className="size-4" /> {new Date(exam.date).toDateString()}</span>
                <span className="inline-flex items-center gap-2"><Users className="size-4" /> {students.length} students</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 pt-5 border-t border-border">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                  <div className="font-mono-stat text-2xl">{exam.totalMarks}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg</div>
                  <div className="font-mono-stat text-2xl">{hasScores ? avg.toFixed(1) : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top</div>
                  <div className="font-mono-stat text-2xl text-accent">{hasScores ? top.marks : "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground truncate">
                  {hasScores ? <>🏆 {top.student.name} · {top.team.name}</> : <span className="italic">Awaiting marks</span>}
                </div>
                {canEdit && (
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/upload?exam=${exam.id}`}><Upload className="size-3.5 mr-1" /> Marks</Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Exams;
