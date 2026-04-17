"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createBillingGroup, updateBillingGroup, deleteBillingGroup, setSchoolBillingGroup,
} from "@/lib/actions/billing";

type BillingGroup = { id: number; name: string };
type School = { id: number; name: string; billingGroupId: number | null };

export function BillingGroupsTab({
  groups,
  schools,
}: {
  groups: BillingGroup[];
  schools: School[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillingGroup | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  function openCreate() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(g: BillingGroup) { setEditing(g); setName(g.name); setOpen(true); }
  function close() { setOpen(false); setEditing(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) await updateBillingGroup(editing.id, { name });
    else await createBillingGroup({ name });
    close();
  }

  async function handleSchoolGroup(schoolId: number, groupId: string) {
    setSaving((s) => ({ ...s, [schoolId]: true }));
    await setSchoolBillingGroup(schoolId, groupId ? Number(groupId) : null);
    setSaving((s) => ({ ...s, [schoolId]: false }));
  }

  return (
    <>
      <div className="space-y-6">
        {/* Groups list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Billing Groups</h3>
            <Button size="sm" onClick={openCreate}><Plus className="mr-1 size-3" />Add Group</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schools</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">No billing groups yet.</TableCell></TableRow>
                )}
                {groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{schools.filter((s) => s.billingGroupId === g.id).length}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(g)}><Pencil className="size-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete group?")) deleteBillingGroup(g.id); }}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* School assignments */}
        <div className="space-y-2">
          <h3 className="font-semibold">School → Billing Group Assignments</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Billing Group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Select
                        value={s.billingGroupId?.toString() ?? ""}
                        onValueChange={(v) => handleSchoolGroup(s.id, v ?? "")}
                        disabled={saving[s.id]}
                      >
                        <SelectTrigger className="h-7 w-48 text-sm">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Group" : "Add Billing Group"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
