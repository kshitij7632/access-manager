import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const NewExamDialog = () => {
  const { addExam } = useAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalMarks, setTotalMarks] = useState(100);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedName || !trimmedSubject || !date) {
      toast.error("Fill in name, subject, and date");
      return;
    }
    if (totalMarks < 1 || totalMarks > 1000) {
      toast.error("Total marks must be 1–1000");
      return;
    }
    const created = await addExam({ name: trimmedName, subject: trimmedSubject, date, totalMarks });
    if (!created) {
      toast.error("Could not create exam");
      return;
    }
    toast.success("Exam created", { description: `${created.name} on ${new Date(date).toDateString()}` });
    setOpen(false);
    setName(""); setSubject(""); setTotalMarks(100);
    navigate(`/upload?exam=${created.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
          <Plus className="size-4 mr-1" /> New Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Create new exam</DialogTitle>
          <DialogDescription>Set the basics. You'll upload marks right after.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="exam-name">Exam name</Label>
            <Input id="exam-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mock Test 05" maxLength={80} required />
          </div>
          <div>
            <Label htmlFor="exam-subject">Subject</Label>
            <Input id="exam-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics / Maths / Full Syllabus" maxLength={60} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exam-date">Date</Label>
              <Input id="exam-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="exam-total">Total marks</Label>
              <Input id="exam-total" type="number" min={1} max={1000} value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
              Create exam
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
