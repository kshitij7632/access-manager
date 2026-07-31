import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppState } from "@/context/AppStateContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardPaste, Save, Sparkles, Eraser, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { WinnerPanel } from "@/components/WinnerPanel";
import { useSearchParams } from "react-router-dom";
import { parseCSVWithHeader, downloadCSV } from "@/lib/csv";
import { useRef } from "react";

const MarksUpload = () => {
  const { exams, marks, students, getTeam, upsertMarks } = useAppState();
  const [searchParams] = useSearchParams();
  const initialExam = searchParams.get("exam") || (exams.length > 0 ? exams[exams.length - 1].id : "");
  const [examId, setExamId] = useState<string>(initialExam);
  const [pasteText, setPasteText] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!examId && exams.length > 0) {
      setExamId(exams[exams.length - 1].id);
    }
  }, [exams, examId]);

  const selectedExam = exams.find(e => e.id === examId);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = (file: File) => {
    if (!selectedExam) { toast.error("Pick an exam first"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { headers, rows: csvRows } = parseCSVWithHeader(text);
      // Accept "studentId,marks" OR "name,marks" OR "id,marks" OR "email,marks"
      const idKey = headers.find(h => ["studentid", "id"].includes(h));
      const nameKey = headers.find(h => h === "name");
      const emailKey = headers.find(h => h === "email");
      const marksKey = headers.find(h => ["marks", "score"].includes(h));
      if (!marksKey || (!idKey && !nameKey && !emailKey)) {
        toast.error("CSV must include 'marks' and one of: studentId, name, email");
        return;
      }
      const total = selectedExam.totalMarks;
      let matched = 0; let skipped = 0;
      const next = [...rows];
      for (const r of csvRows) {
        const num = marksKey ? Number(r[marksKey]) : NaN;
        if (!Number.isFinite(num)) { skipped++; continue; }
        let student;
        if (idKey && r[idKey]) {
          const val = String(r[idKey]).toLowerCase();
          student = students.find(s => s.id.toLowerCase() === val);
        }
        if (!student && nameKey && r[nameKey]) {
          const q = String(r[nameKey]).toLowerCase();
          student = students.find(s => s.name.toLowerCase() === q) || students.find(s => s.name.toLowerCase().includes(q));
        }
        if (!student) { skipped++; continue; }
        const matchedStudent = student;
        const idx = next.findIndex(rw => rw.studentId === matchedStudent.id);
        if (idx !== -1) {
          next[idx] = { ...next[idx], value: String(Math.max(0, Math.min(total, num))) };
          matched++;
        }
      }
      setRows(next);
      toast.success(`Imported ${matched} mark${matched === 1 ? "" : "s"}`, skipped ? { description: `${skipped} row${skipped === 1 ? "" : "s"} skipped` } : undefined);
    };
    reader.readAsText(file);
  };

  // Build editable rows seeded from existing marks
  const initialRows = useMemo(() => {
    return students.map(s => {
      const existing = marks.find(m => m.studentId === s.id && m.examId === examId);
      return { studentId: s.id, value: existing ? String(existing.marks) : "" };
    });
  }, [examId, marks]);

  const [rows, setRows] = useState(initialRows);

  // Reset rows when exam changes
  useEffect(() => setRows(initialRows), [initialRows]);

  const updateRow = (studentId: string, value: string) => {
    setRows(prev => prev.map(r => (r.studentId === studentId ? { ...r, value } : r)));
  };

  const handlePasteParse = () => {
    if (!pasteText.trim()) {
      toast.error("Paste some marks first");
      return;
    }
    // Accepts lines like "Aarav Sharma, 87" or "s1 87" or "s1,87" or "Aarav 87"
    const lines = pasteText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let matched = 0;
    const next = [...rows];
    for (const line of lines) {
      const parts = line.split(/[,;\t]|\s+/).filter(Boolean);
      if (parts.length < 2) continue;
      const numStr = parts[parts.length - 1];
      const num = Number(numStr);
      if (!Number.isFinite(num)) continue;
      const ident = parts.slice(0, -1).join(" ").toLowerCase();
      const student =
        students.find(s => s.id.toLowerCase() === ident) ||
        students.find(s => s.name.toLowerCase() === ident) ||
        students.find(s => s.name.toLowerCase().includes(ident)) ||
        students.find(s => ident.includes(s.name.toLowerCase().split(" ")[0]));
      if (!student) continue;
      const idx = next.findIndex(r => r.studentId === student.id);
      if (idx !== -1) {
        next[idx] = { ...next[idx], value: String(num) };
        matched++;
      }
    }
    setRows(next);
    toast.success(`Parsed ${matched} of ${lines.length} lines`);
  };

  const handleClear = () => {
    setRows(rows.map(r => ({ ...r, value: "" })));
    setPasteText("");
  };

  const handleSave = async () => {
    if (!selectedExam) return;
    const total = selectedExam.totalMarks;
    const entries = rows
      .filter(r => r.value !== "" && !Number.isNaN(Number(r.value)))
      .map(r => ({ studentId: r.studentId, marks: Math.max(0, Math.min(total, Number(r.value))) }));
    if (entries.length === 0) {
      toast.error("Enter at least one mark");
      return;
    }
    await upsertMarks(selectedExam.id, entries);
    toast.success(`Saved marks for ${entries.length} students`, { description: `${selectedExam.name} processed` });
    setShowResults(true);
  };

  return (
    <div className="px-4 md:px-10 py-8 md:py-12">
      <PageHeader
        eyebrow="Marks Center"
        title="Upload Marks"
        description="Enter marks per student or paste a list. Once saved, leaderboards and the winner panel update instantly."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Label className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Exam</Label>
            <Select value={examId || undefined} onValueChange={setExamId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select an exam…" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {exams.length === 0 ? (
                  <SelectItem value="placeholder-no-exams" disabled>No exams available</SelectItem>
                ) : (
                  exams.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} · {e.subject}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedExam && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground uppercase tracking-widest text-[10px]">Date</div>
                  <div className="font-bold mt-0.5">{new Date(selectedExam.date).toDateString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-widest text-[10px]">Out of</div>
                  <div className="font-mono-stat text-xl text-accent">{selectedExam.totalMarks}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <Label className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Paste marks</Label>
            <p className="text-xs text-muted-foreground mt-1">
              One per line: <code className="font-mono">Name, Marks</code> or <code className="font-mono">s1 87</code>
            </p>
            <Textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={"Aarav Sharma, 87\nDiya Patel, 92\ns3 78"}
              rows={6}
              className="mt-2 font-mono text-sm"
              maxLength={5000}
            />
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={handlePasteParse} className="h-11 justify-center">
                <ClipboardPaste className="size-4 mr-1" /> Parse
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="h-11 justify-center">
                <Upload className="size-4 mr-1" /> CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 justify-center"
                onClick={() => downloadCSV("marks-template.csv", "studentId,name,marks\ns1,Aarav Sharma,87\ns2,Diya Patel,92\n")}
              >
                <Download className="size-4 mr-1" /> Template
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-11 justify-center">
                <Eraser className="size-4 mr-1" /> Clear
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ""; }}
              />
            </div>
          </div>

          <Button onClick={handleSave} size="lg" className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold h-12 text-base">
            <Save className="size-4 mr-1" /> Save & Process Results
          </Button>
        </div>

        {/* Per-student grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Students</div>
              <h3 className="font-display text-2xl">Enter marks ({students.length})</h3>
            </div>
            <div className="text-xs text-muted-foreground">Out of <span className="text-accent font-bold">{selectedExam?.totalMarks ?? 0}</span></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-1">
            {students.map(s => {
              const team = getTeam(s.teamId);
              const row = rows.find(r => r.studentId === s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/60 hover:border-accent/40 transition-smooth">
                  <div className="size-9 rounded-lg bg-secondary grid place-items-center text-xs font-bold shrink-0">{s.avatar}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{team.name} · {s.branch}</div>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={selectedExam?.totalMarks ?? 100}
                    value={row?.value ?? ""}
                    onChange={e => updateRow(s.id, e.target.value)}
                    className="w-20 text-right font-mono"
                    placeholder="—"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showResults && examId && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-accent" />
            <h3 className="font-display text-2xl">Results processed</h3>
          </div>
          <WinnerPanel examId={examId} />
        </div>
      )}
    </div>
  );
};

export default MarksUpload;
