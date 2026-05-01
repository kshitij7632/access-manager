import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseCSVWithHeader, downloadCSV } from "@/lib/csv";

const SAMPLE = `name,email,password,class,rollNo
Aarav Kumar,aarav.k@scorebuzz.app,welcome123,10-A,12
Priya Singh,priya.s@scorebuzz.app,welcome123,10-A,13
Rohit Mehta,rohit.m@scorebuzz.app,,10-B,5`;

export const StudentImportDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { bulkCreateStudents } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ created: number; errors: { row: number; email?: string; error: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setText(""); setResult(null); };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!text.trim()) { toast.error("Paste or upload a CSV first"); return; }
    const { headers, rows } = parseCSVWithHeader(text);
    if (!headers.includes("name") || !headers.includes("email")) {
      toast.error("CSV must include 'name' and 'email' columns");
      return;
    }
    const mapped = rows.map(r => ({ name: r.name, email: r.email, password: r.password || undefined }));
    const res = bulkCreateStudents(mapped);
    setResult({ created: res.created.length, errors: res.errors });
    if (res.created.length) {
      toast.success(`Created ${res.created.length} student${res.created.length === 1 ? "" : "s"}`);
    } else {
      toast.error("No students created");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary"><Upload className="size-4 mr-2" /> Bulk import</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import students from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <FileText className="size-3.5" /> Required columns: <code className="font-mono">name, email</code> · Optional: <code className="font-mono">password</code>
            </div>
            <div>If password is blank, <code className="font-mono">student123</code> is set and the user must reset on first login.</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4 mr-2" /> Choose CSV file
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadCSV("student-template.csv", SAMPLE)}>
              <Download className="size-4 mr-2" /> Template
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>Load sample</Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={SAMPLE}
            rows={10}
            className="font-mono text-xs"
          />

          {result && (
            <div className="space-y-2">
              {result.created > 0 && (
                <div className="flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="size-4" /> Created {result.created} student account{result.created === 1 ? "" : "s"}.
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 text-destructive text-sm font-bold mb-2">
                    <AlertCircle className="size-4" /> {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>
                        <span className="font-mono text-foreground">Row {e.row}</span>
                        {e.email && <> · <span className="font-mono">{e.email}</span></>} — {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={() => setOpen(false)} className="bg-gradient-gold text-accent-foreground font-bold">Done</Button>
          ) : (
            <Button onClick={handleImport} className="bg-gradient-gold text-accent-foreground font-bold">
              <Upload className="size-4 mr-2" /> Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
