"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { createMenu, updateMenu, deleteMenu } from "@/lib/actions/menus";

type Menu = {
  id: number;
  name: string;
  cycleWeeks: number;
  effectiveDate: Date;
  isBoxMenu: boolean;
  delaySnack: boolean;
  _count: { items: number; schoolMenus: number };
};

const empty = { name: "", cycleWeeks: 4, effectiveDate: "", isBoxMenu: false, delaySnack: false, menuTypeId: null };

export function MenusList({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);
  const [form, setForm] = useState(empty);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(m: Menu) {
    setEditing(m);
    setForm({
      name: m.name,
      cycleWeeks: m.cycleWeeks,
      effectiveDate: m.effectiveDate.toISOString().split("T")[0],
      isBoxMenu: m.isBoxMenu,
      delaySnack: m.delaySnack,
      menuTypeId: null,
    });
    setOpen(true);
  }
  function close() { setOpen(false); setEditing(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, cycleWeeks: Number(form.cycleWeeks), effectiveDate: new Date(form.effectiveDate) };
    if (editing) await updateMenu(editing.id, data);
    else await createMenu(data);
    close();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Menus</h1>
        <Button onClick={openCreate}><Plus className="mr-2 size-4" />Add Menu</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Box Menu</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Schools</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {menus.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No menus yet.</TableCell>
              </TableRow>
            )}
            {menus.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.cycleWeeks}w</TableCell>
                <TableCell>{new Date(m.effectiveDate).toLocaleDateString()}</TableCell>
                <TableCell>{m.isBoxMenu ? <Badge>Box</Badge> : "—"}</TableCell>
                <TableCell>{m._count.items}</TableCell>
                <TableCell>{m._count.schoolMenus}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" render={<Link href={`/menus/${m.id}`} />}>
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this menu?")) deleteMenu(m.id); }}>
                      <Trash2 className="size-4 text-destructive" />
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
            <DialogTitle>{editing ? "Edit Menu" : "Add Menu"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cycle Weeks</Label>
                <Input type="number" min={1} max={8} value={form.cycleWeeks} onChange={(e) => setForm({ ...form, cycleWeeks: Number(e.target.value) })} required />
              </div>
              <div className="space-y-1">
                <Label>Effective Date</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-6">
              {[{ key: "isBoxMenu", label: "Box Menu" }, { key: "delaySnack", label: "Delay Snack" }].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={form[key as keyof typeof form] as boolean}
                    onCheckedChange={(v) => setForm({ ...form, [key]: !!v })}
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
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
