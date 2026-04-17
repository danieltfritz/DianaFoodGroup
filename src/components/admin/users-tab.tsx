"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { createUser, updateUser, deleteUser, adminResetPassword } from "@/lib/actions/users";

type User = { id: string; name: string | null; email: string; role: string; createdAt: Date };

export function UsersTab({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function openCreate() {
    setEditing(null); setName(""); setEmail(""); setPassword(""); setRole("staff"); setError(""); setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u); setName(u.name ?? ""); setEmail(u.email); setPassword(""); setRole(u.role as "admin" | "staff"); setError(""); setOpen(true);
  }
  function close() { setOpen(false); setEditing(null); setError(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (editing) {
          await updateUser(editing.id, { name, role });
        } else {
          await createUser({ name, email, password, role });
        }
        close();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  async function handleDelete(u: User) {
    if (u.id === currentUserId) return alert("Cannot delete your own account.");
    if (!confirm(`Delete user ${u.email}?`)) return;
    startTransition(() => deleteUser(u.id));
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setError("");
    startTransition(async () => {
      try {
        await adminResetPassword(resetTarget.id, newPassword);
        setResetTarget(null); setNewPassword("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reset.");
      }
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Users</h3>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 size-3" />Add User</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setResetTarget(u); setNewPassword(""); setError(""); }}>
                        <KeyRound className="size-3" />
                      </Button>
                      {u.id !== currentUserId && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(u)}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            {!editing && (
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
            {!editing && (
              <div className="space-y-1">
                <Label>Password *</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as "admin" | "staff")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setError(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password — {resetTarget?.email}</DialogTitle></DialogHeader>
          <form onSubmit={handleReset} className="space-y-3">
            <div className="space-y-1">
              <Label>New Password *</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setResetTarget(null); setError(""); }}>Cancel</Button>
              <Button type="submit">Reset</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
