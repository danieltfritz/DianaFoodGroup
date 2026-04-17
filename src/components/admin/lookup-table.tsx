"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

interface Row {
  id: number;
  [key: string]: unknown;
}

interface Column {
  key: string;
  label: string;
  type?: "text" | "number";
}

interface LookupTableProps<T extends Row> {
  title: string;
  rows: T[];
  columns: Column[];
  onCreate: (data: Record<string, string>) => Promise<void>;
  onUpdate: (id: number, data: Record<string, string>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function LookupTable<T extends Row>({ title, rows, columns, onCreate, onUpdate, onDelete }: LookupTableProps<T>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  function startEdit(row: T) {
    setEditingId(row.id);
    const vals: Record<string, string> = {};
    columns.forEach((c) => { vals[c.key] = String(row[c.key] ?? ""); });
    setEditValues(vals);
  }

  function cancelEdit() { setEditingId(null); setEditValues({}); }

  async function saveEdit() {
    if (editingId === null) return;
    await onUpdate(editingId, editValues);
    cancelEdit();
  }

  function startAdd() {
    const vals: Record<string, string> = {};
    columns.forEach((c) => { vals[c.key] = ""; });
    setNewValues(vals);
    setAdding(true);
  }

  function cancelAdd() { setAdding(false); setNewValues({}); }

  async function saveAdd() {
    await onCreate(newValues);
    cancelAdd();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button size="sm" onClick={startAdd}><Plus className="mr-1 size-3" />Add</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {adding && (
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    <Input
                      value={newValues[c.key] ?? ""}
                      onChange={(e) => setNewValues({ ...newValues, [c.key]: e.target.value })}
                      className="h-7 text-sm"
                      type={c.type ?? "text"}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveAdd}><Check className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelAdd}><X className="size-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {rows.length === 0 && !adding && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-6 text-sm">
                  No records yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {editingId === row.id ? (
                      <Input
                        value={editValues[c.key] ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, [c.key]: e.target.value })}
                        className="h-7 text-sm"
                        type={c.type ?? "text"}
                      />
                    ) : (
                      String(row[c.key] ?? "—")
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {editingId === row.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="size-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="size-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row)}><Pencil className="size-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) onDelete(row.id); }}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
