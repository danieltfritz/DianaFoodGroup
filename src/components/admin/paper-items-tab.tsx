"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createPaperItem, updatePaperItem,
  createPaperSize, updatePaperSize, deletePaperSize,
  createPaperContainer, updatePaperContainer, deletePaperContainer,
} from "@/lib/actions/paper";

type PaperSize = { id: number; name: string | null };
type PaperContainer = { id: number; paperSizeId: number; containerName: string; containerSize: number };
type PaperItem = {
  id: number;
  name: string;
  active: boolean;
  sizes: PaperSize[];
  containers: PaperContainer[];
};

// ─── Edit dialog (sizes + containers share lifted state) ──────────────────────

function EditDialog({
  item,
  onClose,
}: {
  item: PaperItem;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [active, setActive] = useState(item.active);
  const [sizes, setSizes] = useState<PaperSize[]>(item.sizes);
  const [containers, setContainers] = useState<PaperContainer[]>(item.containers);

  // Size editing state
  const [sizeEditId, setSizeEditId] = useState<number | null>(null);
  const [sizeEditName, setSizeEditName] = useState("");
  const [newSizeName, setNewSizeName] = useState("");

  // Container editing state
  const [ctrEditId, setCtrEditId] = useState<number | null>(null);
  const [ctrEditName, setCtrEditName] = useState("");
  const [ctrEditSize, setCtrEditSize] = useState("");
  const [newCtrSizeId, setNewCtrSizeId] = useState<number | "">(item.sizes[0]?.id ?? "");
  const [newCtrName, setNewCtrName] = useState("");
  const [newCtrSize, setNewCtrSize] = useState("");

  const [, startTransition] = useTransition();

  // — Basic info —
  function handleSaveBasic(e: { preventDefault(): void }) {
    e.preventDefault();
    startTransition(() => updatePaperItem(item.id, name, active));
  }

  // — Sizes —
  function startSizeEdit(s: PaperSize) { setSizeEditId(s.id); setSizeEditName(s.name ?? ""); }
  function cancelSizeEdit() { setSizeEditId(null); }

  function saveSizeEdit(id: number) {
    setSizes((prev) => prev.map((s) => s.id === id ? { ...s, name: sizeEditName.trim() || null } : s));
    setSizeEditId(null);
    startTransition(() => updatePaperSize(id, sizeEditName));
  }

  function handleDeleteSize(id: number) {
    if (!confirm("Delete this size? Its packaging rows will also be removed.")) return;
    setSizes((prev) => prev.filter((s) => s.id !== id));
    setContainers((prev) => prev.filter((c) => c.paperSizeId !== id));
    startTransition(() => deletePaperSize(id));
  }

  function handleAddSize(e: { preventDefault(): void }) {
    e.preventDefault();
    const n = newSizeName.trim();
    setNewSizeName("");
    const tempId = -Date.now();
    setSizes((prev) => [...prev, { id: tempId, name: n || null }]);
    if (sizes.length === 0) setNewCtrSizeId(tempId);
    startTransition(async () => {
      const realId = await createPaperSize(item.id, n);
      setSizes((prev) => prev.map((s) => s.id === tempId ? { ...s, id: realId } : s));
      setContainers((prev) => prev.map((c) => c.paperSizeId === tempId ? { ...c, paperSizeId: realId } : c));
      if (newCtrSizeId === tempId) setNewCtrSizeId(realId);
    });
  }

  // — Containers —
  function startCtrEdit(c: PaperContainer) {
    setCtrEditId(c.id);
    setCtrEditName(c.containerName);
    setCtrEditSize(String(c.containerSize));
  }
  function cancelCtrEdit() { setCtrEditId(null); }

  function saveCtrEdit(c: PaperContainer) {
    const sz = Number(ctrEditSize);
    setContainers((prev) => prev.map((x) => x.id === c.id ? { ...x, containerName: ctrEditName, containerSize: sz } : x));
    setCtrEditId(null);
    startTransition(() => updatePaperContainer(c.id, ctrEditName, sz));
  }

  function handleDeleteCtr(id: number) {
    if (!confirm("Delete this packaging row?")) return;
    setContainers((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deletePaperContainer(id));
  }

  function handleAddCtr(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!newCtrSizeId || !newCtrName.trim() || !newCtrSize) return;
    const sizeId = Number(newCtrSizeId);
    const sz = Number(newCtrSize);
    const n = newCtrName.trim();
    setNewCtrName(""); setNewCtrSize("");
    const tempId = -Date.now();
    setContainers((prev) => [...prev, { id: tempId, paperSizeId: sizeId, containerName: n, containerSize: sz }]);
    startTransition(async () => {
      const realId = await createPaperContainer(item.id, sizeId, n, sz);
      setContainers((prev) => prev.map((c) => c.id === tempId ? { ...c, id: realId } : c));
    });
  }

  const sizeLabel = (id: number) => sizes.find((s) => s.id === id)?.name ?? `#${id}`;

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <form onSubmit={handleSaveBasic} className="space-y-3 pb-5 border-b">
        <p className="text-sm font-medium">Basic Info</p>
        <div className="space-y-1">
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="edit-active">Active</Label>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm">Save Name / Status</Button>
        </div>
      </form>

      {/* Sizes */}
      <div className="space-y-2 pb-5 border-b">
        <p className="text-sm font-medium">Sizes</p>
        {sizes.length > 0 && (
          <div className="rounded-md border divide-y">
            {sizes.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5">
                {sizeEditId === s.id ? (
                  <>
                    <Input
                      value={sizeEditName}
                      onChange={(e) => setSizeEditName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveSizeEdit(s.id); } if (e.key === "Escape") cancelSizeEdit(); }}
                    />
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveSizeEdit(s.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelSizeEdit}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">
                      {s.name ?? <span className="text-muted-foreground italic">unnamed</span>}
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startSizeEdit(s)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteSize(s.id)}>
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddSize} className="flex gap-2">
          <Input
            placeholder="Size name…"
            value={newSizeName}
            onChange={(e) => setNewSizeName(e.target.value)}
            className="h-7 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="h-7 px-2 shrink-0">
            <Plus className="size-3 mr-1" />Add Size
          </Button>
        </form>
      </div>

      {/* Containers */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Packaging</p>
        {sizes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Add sizes first before adding packaging.</p>
        ) : (
          <>
            {containers.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-1.5">Size</TableHead>
                      <TableHead className="py-1.5">Container</TableHead>
                      <TableHead className="py-1.5 text-right">Pack Qty</TableHead>
                      <TableHead className="py-1.5 w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((c) => (
                      <TableRow key={c.id}>
                        {ctrEditId === c.id ? (
                          <>
                            <TableCell className="py-1">{sizeLabel(c.paperSizeId)}</TableCell>
                            <TableCell className="py-1">
                              <Input
                                value={ctrEditName}
                                onChange={(e) => setCtrEditName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <Input
                                type="number"
                                value={ctrEditSize}
                                onChange={(e) => setCtrEditSize(e.target.value)}
                                className="h-7 text-sm w-20 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveCtrEdit(c)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelCtrEdit}>✕</Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="py-1 text-sm">{sizeLabel(c.paperSizeId)}</TableCell>
                            <TableCell className="py-1 text-sm">{c.containerName}</TableCell>
                            <TableCell className="py-1 text-sm text-right">{c.containerSize}</TableCell>
                            <TableCell className="py-1">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startCtrEdit(c)}>
                                  <Pencil className="size-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteCtr(c.id)}>
                                  <Trash2 className="size-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <form onSubmit={handleAddCtr} className="flex gap-2 flex-wrap items-center">
              <select
                value={newCtrSizeId}
                onChange={(e) => setNewCtrSizeId(Number(e.target.value))}
                className="h-7 rounded-md border border-input bg-background px-2 text-sm"
              >
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name ?? `#${s.id}`}</option>
                ))}
              </select>
              <Input
                placeholder="Container name…"
                value={newCtrName}
                onChange={(e) => setNewCtrName(e.target.value)}
                className="h-7 text-sm w-36"
                required
              />
              <Input
                type="number"
                placeholder="Pack qty"
                value={newCtrSize}
                onChange={(e) => setNewCtrSize(e.target.value)}
                className="h-7 text-sm w-24"
                required
              />
              <Button type="submit" size="sm" variant="outline" className="h-7 px-2 shrink-0">
                <Plus className="size-3 mr-1" />Add
              </Button>
            </form>
          </>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function PaperItemsTab({ paperItems }: { paperItems: PaperItem[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaperItem | null>(null);
  const [createName, setCreateName] = useState("");
  const [, startTransition] = useTransition();

  function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    startTransition(() => createPaperItem(createName));
    setCreateOpen(false);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Paper Items</h3>
          <Button size="sm" variant="outline" onClick={() => { setCreateName(""); setCreateOpen(true); }}>
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
                      {item.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditItem(item)}>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Paper Item</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} required autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Paper Item — {editItem?.name}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <EditDialog key={editItem.id} item={editItem} onClose={() => setEditItem(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
