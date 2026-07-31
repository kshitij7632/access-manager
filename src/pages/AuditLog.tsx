import { PageHeader } from "@/components/PageHeader";
import { useAudit, ACTION_LABEL } from "@/context/AuditContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Search } from "lucide-react";
import { useMemo, useState } from "react";

const AuditLog = () => {
  const { entries, clear } = useAudit();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(e =>
      [e.action, e.actorName, e.actorRole, e.targetLabel, e.targetId, e.detail]
        .filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }, [entries, q]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Forensics"
          title="Audit Log"
          description="Every account, role and data change — chronologically, immutable."
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!entries.length}>
              <Trash2 className="size-4 mr-1" /> Clear log
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the entire audit log?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes all {entries.length} entries.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={clear}
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search action, actor, target…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(e.at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {e.actorName ? (
                    <div>
                      <div className="font-medium">{e.actorName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{e.actorRole}</div>
                    </div>
                  ) : <span className="text-muted-foreground">system</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {e.targetLabel ? (
                    <div>
                      <div>{e.targetLabel}</div>
                      {e.targetId && <div className="font-mono text-[10px] text-muted-foreground">{e.targetId}</div>}
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.detail ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  {entries.length === 0 ? "No activity logged yet." : "No entries match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (md:hidden) */}
      <div className="space-y-3 md:hidden">
        {filtered.map(e => (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {ACTION_LABEL[e.action] ?? e.action}
              </Badge>
              <div className="text-[11px] text-muted-foreground font-mono">
                {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Actor: </span>
                <span className="font-semibold">{e.actorName ?? "system"}</span>
                {e.actorRole && <span className="text-[10px] text-accent uppercase font-bold ml-1.5">({e.actorRole})</span>}
              </div>
            </div>
            {e.targetLabel && (
              <div className="text-xs text-muted-foreground">
                Target: <span className="text-foreground font-medium">{e.targetLabel}</span>
              </div>
            )}
            {e.detail && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                {e.detail}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border">
            {entries.length === 0 ? "No activity logged yet." : "No entries match your search."}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
