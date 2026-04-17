"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { createFoodItem, updateFoodItem, deleteFoodItem } from "@/lib/actions/food";

type FoodItem = {
  id: number;
  name: string;
  tempType: string;
  isMilk: boolean;
  hasLabel: boolean;
  showOnReport: boolean;
  pkUnit: string | null;
  pkSize: number | null;
  defaultContainerId: number | null;
  foodTypeId: number | null;
  menuTypeId: number | null;
  containerThreshold: unknown;
};

type Container = { id: number; name: string };

type FormState = {
  name: string;
  tempType: "hot" | "cold";
  isMilk: boolean;
  hasLabel: boolean;
  showOnReport: boolean;
  foodTypeId: number | null;
  menuTypeId: number | null;
  defaultContainerId: number | null;
  containerThreshold: number | null;
  pkSize: number | null;
  pkUnit: string;
};

const empty: FormState = {
  name: "", tempType: "hot", isMilk: false, hasLabel: true,
  showOnReport: true, foodTypeId: null, menuTypeId: null,
  defaultContainerId: null, containerThreshold: null, pkSize: null, pkUnit: "",
};

export function FoodItemsTable({ foodItems, containers }: { foodItems: FoodItem[]; containers: Container[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(f: FoodItem) {
    setEditing(f);
    setForm({
      name: f.name,
      tempType: (f.tempType === "cold" ? "cold" : "hot") as "hot" | "cold",
      isMilk: f.isMilk,
      hasLabel: f.hasLabel,
      showOnReport: f.showOnReport,
      foodTypeId: f.foodTypeId ?? null,
      menuTypeId: f.menuTypeId ?? null,
      defaultContainerId: f.defaultContainerId ?? null,
      containerThreshold: f.containerThreshold ? Number(f.containerThreshold) : null,
      pkSize: f.pkSize ?? null,
      pkUnit: f.pkUnit ?? "",
    });
    setOpen(true);
  }

  function close() { setOpen(false); setEditing(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...form,
      containerThreshold: form.containerThreshold ? Number(form.containerThreshold) : null,
    };
    if (editing) await updateFoodItem(editing.id, data);
    else await createFoodItem(data);
    close();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Food Items</h3>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 size-3" />Add</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Milk</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Container</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodItems.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No food items yet.</TableCell></TableRow>
              )}
              {foodItems.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <Badge variant={f.tempType === "hot" ? "destructive" : "secondary"}>{f.tempType}</Badge>
                  </TableCell>
                  <TableCell>{f.isMilk ? "Yes" : "—"}</TableCell>
                  <TableCell>{f.hasLabel ? "Yes" : "No"}</TableCell>
                  <TableCell>{containers.find((c) => c.id === f.defaultContainerId)?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="size-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) deleteFoodItem(f.id); }}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Temperature</Label>
                <Select value={form.tempType} onValueChange={(v) => setForm({ ...form, tempType: v as "hot" | "cold" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Default Container</Label>
                <Select
                  value={form.defaultContainerId?.toString() ?? ""}
                  onValueChange={(v) => setForm({ ...form, defaultContainerId: v ? Number(v) : null })}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {containers.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pk Size</Label>
                <Input type="number" value={form.pkSize ?? ""} onChange={(e) => setForm({ ...form, pkSize: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-1">
                <Label>Pk Unit</Label>
                <Input value={form.pkUnit ?? ""} onChange={(e) => setForm({ ...form, pkUnit: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-6">
              {[
                { key: "isMilk", label: "Milk Item" },
                { key: "hasLabel", label: "Has Label" },
                { key: "showOnReport", label: "Show on Report" },
              ].map(({ key, label }) => (
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
