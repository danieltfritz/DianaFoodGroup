"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { createSchoolMenu, updateSchoolMenu, deleteSchoolMenu } from "@/lib/actions/school-menus";

type Menu = { id: number; name: string; cycleWeeks: number };
type SchoolMenu = { id: number; schoolId: number; menuId: number; startDate: Date; endDate: Date | null; menu: Menu };

const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString() : "—";
const toInput = (d: Date | null) => d ? new Date(d).toISOString().split("T")[0] : "";

export function SchoolMenusTab({ schoolId, menus, schoolMenus }: {
  schoolId: number;
  menus: Menu[];
  schoolMenus: SchoolMenu[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolMenu | null>(null);
  const [form, setForm] = useState({ menuId: "", startDate: "", endDate: "" });

  function openCreate() {
    setEditing(null);
    setForm({ menuId: "", startDate: "", endDate: "" });
    setOpen(true);
  }

  function openEdit(sm: SchoolMenu) {
    setEditing(sm);
    setForm({ menuId: String(sm.menuId), startDate: toInput(sm.startDate), endDate: toInput(sm.endDate) });
    setOpen(true);
  }

  function close() { setOpen(false); setEditing(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      schoolId,
      menuId: Number(form.menuId),
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : null,
    };
    if (editing) await updateSchoolMenu(editing.id, data);
    else await createSchoolMenu(data);
    close();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Menu Assignments</h3>
        <Button size="sm" onClick={openCreate}><Plus className="mr-1 size-3" />Assign Menu</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolMenus.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">No menus assigned.</TableCell></TableRow>
            )}
            {schoolMenus.map((sm) => (
              <TableRow key={sm.id}>
                <TableCell className="font-medium">{sm.menu.name}</TableCell>
                <TableCell>{sm.menu.cycleWeeks}w</TableCell>
                <TableCell>{fmt(sm.startDate)}</TableCell>
                <TableCell>{fmt(sm.endDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(sm)}><Pencil className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Remove assignment?")) deleteSchoolMenu(sm.id, schoolId); }}>
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Assignment" : "Assign Menu"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Menu *</Label>
              <Select value={form.menuId} onValueChange={(v) => v && setForm({ ...form, menuId: v })}>
                <SelectTrigger><SelectValue placeholder="Select menu" /></SelectTrigger>
                <SelectContent>
                  {menus.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.cycleWeeks}w)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
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
