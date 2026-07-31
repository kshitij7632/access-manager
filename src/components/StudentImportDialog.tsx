import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, RefreshCw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { parseCSVWithHeader, downloadCSV } from "@/lib/csv";

import { useQueryClient } from "@tanstack/react-query";
import { useAppState } from "@/context/AppStateContext";

const SAMPLE = `name,email,password,class,rollNo
Aarav Kumar,aarav.k@scorebuzz.app,welcome123,10-A,12
Priya Singh,priya.s@scorebuzz.app,welcome123,10-A,13
Rohit Mehta,,welcome123,10-B,5`;

type ImportResult = {
  created: number;
  updated: number;
  skipped: { row: number; email?: string }[];
  errors: { row: number; email?: string; error: string }[];
};

export const StudentImportDialog = ({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) => {
  const { bulkCreateStudents, refreshUsers } = useAuth();
  const { refresh: refreshAppState } = useAppState();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setText(""); setResult(null); };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!text.trim()) { toast.error("Paste or upload a CSV first"); return; }
    const { headers, rows } = parseCSVWithHeader(text);
    if (!headers.includes("name")) {
      toast.error("CSV must include a 'name' column");
      return;
    }
    const mapped = rows.map(r => ({
      name: r.name,
      email: r.email || undefined,
      password: r.password || undefined,
      studentClass: r.class || undefined,
      rollNo: r.rollNo || r.roll || undefined,
    }));

    setImporting(true);
    try {
      const res = await bulkCreateStudents(mapped);
      setResult({
        created: res.created.length,
        updated: res.updated.length,
        skipped: res.skipped,
        errors: res.errors,
      });
      await queryClient.invalidateQueries();
      await refreshAppState();
      await refreshUsers();

      const totalSuccess = res.created.length + res.updated.length;
      if (totalSuccess > 0) {
        onSuccess?.();
        toast.success(`Import complete: ${res.created.length} created, ${res.updated.length} updated, ${res.skipped.length} skipped, ${res.errors.length} failed`);
      } else if (res.skipped.length > 0 && res.errors.length === 0) {
        toast.info(`All ${res.skipped.length} rows skipped (already up to date)`);
      } else {
        toast.error(`Import failed: ${res.errors.length} errors`);
      }
    } finally {
      setImporting(false);
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
          <DialogTitle>Bulk import students (CSV / Excel)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <FileText className="size-3.5" /> Required: <code className="font-mono">name, email</code> · Optional: <code className="font-mono">password, class, rollNo</code>
            </div>
            <div>If password is left empty, default password <code className="font-mono">student123</code> will be set automatically.</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4 mr-2" /> Upload CSV / Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadCSV("student-template.csv", SAMPLE)}>
              <Download className="size-4 mr-2" /> Template
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>Load sample</Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls"
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
              <div className="flex items-center gap-4 text-sm font-semibold flex-wrap">
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Created: {result.created}
                </span>
                <span className="text-blue-500 flex items-center gap-1">
                  <RefreshCw className="size-3.5" /> Updated: {result.updated}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <SkipForward className="size-3.5" /> Skipped: {result.skipped.length}
                </span>
                <span className={result.errors.length > 0 ? "text-destructive" : "text-muted-foreground"}>
                  Failed: {result.errors.length}
                </span>
              </div>

              {result.created > 0 && (
                <div className="flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="size-4" /> Created {result.created} new student account{result.created === 1 ? "" : "s"}.
                </div>
              )}
              {result.updated > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-500">
                  <RefreshCw className="size-4" /> Updated {result.updated} existing profile{result.updated === 1 ? "" : "s"}.
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="rounded-xl border border-muted bg-muted/30 p-3 max-h-28 overflow-y-auto">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold mb-2">
                    <SkipForward className="size-4" /> {result.skipped.length} skipped (already up to date)
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {result.skipped.map((s, i) => (
                      <li key={i}>
                        <span className="font-mono text-foreground">Row {s.row}</span>
                        {s.email && <> · <span className="font-mono">{s.email}</span></>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 text-destructive text-sm font-bold mb-2">
                    <AlertCircle className="size-4" /> {result.errors.length} failed student{result.errors.length === 1 ? "" : "s"}
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono text-foreground">Row {e.row}</span>
                        {e.email && <> · <span className="font-mono">{e.email}</span></>} — <span className="text-destructive font-medium">{e.error}</span>
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
            <Button onClick={handleImport} disabled={importing} className="bg-gradient-gold text-accent-foreground font-bold">
              <Upload className="size-4 mr-2" /> {importing ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
