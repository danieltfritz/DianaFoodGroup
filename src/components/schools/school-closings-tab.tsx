"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { createSchoolClosing, deleteSchoolClosing } from "@/lib/actions/school-menus";

type Closing = { id: number; schoolId: number; startDate: Date; endDate: Date };

const fmt = (d: Date) => new Date(d).toLocaleDateString();

export function SchoolClosingsTab({ schoolId, closings }: { schoolId: number; closings: Closing[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSchoolClosing({
      schoolId,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
    });
    setForm({ startDate: "", endDate: "" });
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">School Closings</h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 size-3" />Add Closing</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {closings.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">No closings recorded.</TableCell></TableRow>
            )}
            {closings.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{fmt(c.startDate)}</TableCell>
                <TableCell>{fmt(c.endDate)}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { if (confirm("Delete closing?")) deleteSchoolClosing(c.id, schoolId); }}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Closing</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
