"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPaperGroup, updatePaperGroup, deletePaperGroup,
  addSchoolToPaperGroup, removeSchoolFromPaperGroup,
} from "@/lib/actions/paper";

type School = { id: number; name: string };
type PaperGroup = { id: number; name: string; schools: { schoolId: number }[] };

interface PaperGroupsTabProps {
  groups: PaperGroup[];
  schoolMap: Record<number, string>;
}

export function PaperGroupsTab({ groups, schoolMap }: PaperGroupsTabProps) {
  const [selectedId, setSelectedId] = useState<number | null>(groups[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaperGroup | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const allSchools: School[] = Object.entries(schoolMap)
    .map(([id, n]) => ({ id: Number(id), name: n }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [memberships, setMemberships] = useState<Map<number, Set<number>>>(() => {
    const m = new Map<number, Set<number>>();
    for (const g of groups) {
      m.set(g.id, new Set(g.schools.map((s) => s.schoolId)));
    }
    return m;
  });

  const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;
  const memberIds = selectedId ? (memberships.get(selectedId) ?? new Set<number>()) : new Set<number>();
  const members = allSchools.filter((s) => memberIds.has(s.id));
  const available = allSchools.filter(
    (s) => !memberIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
  );

  function updateMembership(groupId: number, schoolId: number, add: boolean) {
    setMemberships((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(groupId) ?? []);
      if (add) set.add(schoolId); else set.delete(schoolId);
      next.set(groupId, set);
      return next;
    });
  }

  function handleAdd(school: School) {
    if (!selectedId) return;
    updateMembership(selectedId, school.id, true);
    startTransition(() => addSchoolToPaperGroup(school.id, selectedId));
  }

  function handleRemove(school: School) {
    if (!selectedId) return;
    updateMembership(selectedId, school.id, false);
    startTransition(() => removeSchoolFromPaperGroup(school.id, selectedId));
  }

  function openCreate() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(g: PaperGroup) { setEditing(g); setName(g.name); setOpen(true); }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (editing) {
      startTransition(() => updatePaperGroup(editing.id, name));
    } else {
      startTransition(() => createPaperGroup(name));
    }
    setOpen(false);
  }

  function handleDelete(g: PaperGroup) {
    if (!confirm(`Delete group "${g.name}"? Schools will be unassigned.`)) return;
    if (selectedId === g.id) setSelectedId(null);
    startTransition(() => deletePaperGroup(g.id));
  }

  return (
    <>
      <div className="flex gap-6 min-h-[500px]">
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Groups</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={openCreate}>
              <Plus className="size-3" />
            </Button>
          </div>
          <div className="border rounded-md overflow-hidden flex-1">
            {groups.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 italic">No groups yet.</p>
            )}
            {groups.map((g) => {
              const count = memberships.get(g.id)?.size ?? 0;
              return (
                <button
                  key={g.id}
                  onClick={() => { setSelectedId(g.id); setSearch(""); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 border-b last:border-b-0 transition-colors",
                    selectedId === g.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="truncate">{g.name}</span>
                  <span className={cn("text-xs shrink-0", selectedId === g.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!selectedGroup ? (
            <p className="text-sm text-muted-foreground pt-4">Select a group to manage its schools.</p>
          ) : (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedGroup.name}</h3>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(selectedGroup)}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(selectedGroup)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 flex-1 min-h-0">
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    Assigned — click to remove
                    {members.length > 0 && <span className="ml-2 font-medium text-foreground">{members.length} schools</span>}
                  </p>
                  <div className="border rounded-md flex-1 overflow-y-auto max-h-96">
                    {members.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3 italic">No schools assigned.</p>
                    )}
                    {members.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleRemove(s)}
                        className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors border-b last:border-b-0"
                      >
                        <span>{s.name}</span>
                        <X className="size-3 shrink-0 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Available — click to add</p>
                  <Input
                    placeholder="Search schools…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 text-sm mb-1"
                  />
                  <div className="border rounded-md flex-1 overflow-y-auto max-h-[352px]">
                    {available.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3 italic">
                        {search ? "No matches." : "All schools assigned."}
                      </p>
                    )}
                    {available.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAdd(s)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Group" : "Add Paper Group"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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
