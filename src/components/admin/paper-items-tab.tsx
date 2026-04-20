"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { createPaperItem, updatePaperItem } from "@/lib/actions/paper";

type PaperSize = { id: number; name: string | null };
type PaperContainer = { id: number; paperSizeId: number; containerName: string; containerSize: number };
type PaperItem = {
  id: number;
  name: string;
  active: boolean;
  sizes: PaperSize[];
  containers: PaperContainer[];
};

export function PaperItemsTab({ paperItems }: { paperItems: PaperItem[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaperItem | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [, startTransition] = useTransition();

  function openCreate() { setEditing(null); setName(""); setActive(true); setOpen(true); }
  function openEdit(item: PaperItem) { setEditing(item); setName(item.name); setActive(item.active); setOpen(true); }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (editing) {
      startTransition(() => updatePaperItem(editing.id, name, active));
    } else {
      startTransition(() => createPaperItem(name));
    }
    setOpen(false);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Paper Items</h3>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-3 mr-1" />Add Item
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Packaging</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paperItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                    No paper items yet.
                  </TableCell>
                </TableRow>
              )}
              {paperItems.map((item) => {
                const namedSizes = item.sizes.filter((s) => s.name);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {namedSizes.length > 0 ? namedSizes.map((s) => s.name).join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {item.containers.map((c) => {
                          const size = item.sizes.find((s) => s.id === c.paperSizeId);
                          const label = size?.name ? `${size.name} · ` : "";
                          return <span key={c.id}>{label}{c.containerName}: {c.containerSize}</span>;
                        })}
                        {item.containers.length === 0 && "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.active
                        ? <Badge>Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paper Item" : "Add Paper Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="active">Active</Label>
              </div>
            )}
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
