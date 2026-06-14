import { useMemo, useState } from "react";
import { useAuth, Role } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Briefcase, GraduationCap, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { can, creatableRoles } from "@/lib/permissions";
import { StudentImportDialog } from "@/components/StudentImportDialog";

const roleMeta: Record<Role, { label: string; icon: any; cls: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, cls: "bg-accent/15 text-accent border-accent/30" },
  staff: { label: "Staff", icon: Briefcase, cls: "bg-primary/10 text-primary border-primary/30" },
  student: { label: "Student", icon: GraduationCap, cls: "bg-muted text-muted-foreground border-border" },
};

const Users = () => {
  const { user, users, adminCreateUser, deleteUser, updateUserRole } = useAuth();

  const allowedRoles = useMemo(() => creatableRoles(user?.role), [user?.role]);
  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "super_admin";

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [role, setRole] = useState<Role>(allowedRoles[0] ?? "student");
  const [filter, setFilter] = useState<Role | "all">("all");

  if (!can(user?.role, "viewUsers")) {
    return (
      <div className="p-8">
        <PageHeader eyebrow="Restricted" title="Access denied" description="You don't have permission to manage users." />
      </div>
    );
  }

  // Staff can only see/manage student accounts
  const visibleUsers = isStaff ? users.filter(u => u.role === "student") : users;
  const visible = visibleUsers.filter(u => filter === "all" || u.role === filter);

  const counts = {
    all: visibleUsers.length,
    super_admin: visibleUsers.filter(u => u.role === "super_admin").length,
    staff: visibleUsers.filter(u => u.role === "staff").length,
    student: visibleUsers.filter(u => u.role === "student").length,
  };

  const filterChips: (Role | "all")[] = isStaff ? ["all", "student"] : ["all", "super_admin", "staff", "student"];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminCreateUser({
      name, email, password, role,
      ...(role === "student" ? { studentClass, rollNo } : {}),
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not create user");
      return;
    }
    toast.success("User created", { description: `${res.user?.name} · ID ${res.user?.id}` });
    setName(""); setEmail(""); setPassword(""); setStudentClass(""); setRollNo("");
    setRole(allowedRoles[0] ?? "student");
    setOpen(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Control Center"
          title={isStaff ? "Student Management" : "User Management"}
          description={isStaff ? "Add and remove student accounts." : "Create, promote, and remove staff and students."}
        />
        <div className="flex items-center gap-2">
          <StudentImportDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-bold">
                <UserPlus className="size-4 mr-2" /> Add {isStaff ? "student" : "user"}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="cu-name">Full name</Label>
                <Input id="cu-name" value={name} onChange={e => setName(e.target.value)} required maxLength={60} />
              </div>
              <div>
                <Label htmlFor="cu-email">Email</Label>
                <Input id="cu-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="cu-password">Temporary password</Label>
                <Input id="cu-password" type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={60} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={allowedRoles.length === 1}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map(r => (
                      <SelectItem key={r} value={r}>{roleMeta[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedRoles.length === 1 && (
                  <p className="text-[11px] text-muted-foreground mt-1">Staff can only create student accounts.</p>
                )}
              </div>
              {role === "student" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cu-class">Class / Section</Label>
                    <Input id="cu-class" value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="e.g. 10-A" maxLength={30} />
                  </div>
                  <div>
                    <Label htmlFor="cu-roll">Roll no.</Label>
                    <Input id="cu-roll" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="e.g. 23" maxLength={20} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" className="bg-gradient-gold text-accent-foreground font-bold">Create account</Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-smooth",
              filter === k
                ? "bg-gradient-primary text-primary-foreground border-transparent shadow-elegant"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {k === "all" ? "All" : roleMeta[k].label} · {counts[k]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(u => {
              const meta = roleMeta[u.role];
              const Icon = meta.icon;
              const isSelf = u.id === user!.id;
              const canDelete = !isSelf && (isAdmin || (isStaff && u.role === "student"));
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.id}</TableCell>
                  <TableCell className="font-medium">
                    <div>
                      {u.name} {isSelf && <span className="text-[10px] text-accent ml-1">(you)</span>}
                    </div>
                    {u.role === "student" && (u.studentClass || u.rollNo) && (
                      <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                        {u.studentClass && <span>Class {u.studentClass}</span>}
                        {u.studentClass && u.rollNo && <span> · </span>}
                        {u.rollNo && <span>Roll #{u.rollNo}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1", meta.cls)}>
                      <Icon className="size-3" /> {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {isAdmin && (
                        <Select
                          value={u.role}
                          onValueChange={async (v) => {
                            const res = await updateUserRole(u.id, v as Role);
                            if (!res.ok) toast.error(res.error ?? "Failed");
                            else toast.success(`Role updated to ${roleMeta[v as Role].label}`);
                          }}
                          disabled={isSelf}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={!canDelete} className="text-destructive hover:text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the account ({u.id}). This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const res = await deleteUser(u.id);
                                if (!res.ok) toast.error(res.error ?? "Failed");
                                else toast.success("User deleted");
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No users in this category.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Users;
