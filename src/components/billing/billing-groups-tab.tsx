"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBillingGroup, updateBillingGroup, deleteBillingGroup,
  addSchoolToBillingGroup, removeSchoolFromBillingGroup,
} from "@/lib/actions/billing";

type BillingGroup = { id: number; name: string };
type School = { id: number; name: string; billingGroupIds: number[] };

export function BillingGroupsTab({ groups, schools }: { groups: BillingGroup[]; schools: School[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(groups[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillingGroup | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  // Optimistic school membership
  const [memberships, setMemberships] = useState<Map<number, Set<number>>>(() => {
    const m = new Map<number, Set<number>>();
    for (const s of schools) {
      for (const gid of s.billingGroupIds) {
        if (!m.has(gid)) m.set(gid, new Set());
        m.get(gid)!.add(s.id);
      }
    }
    return m;
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const memberIds = selectedGroupId ? (memberships.get(selectedGroupId) ?? new Set<number>()) : new Set<number>();
  const members = schools.filter((s) => memberIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  const available = schools
    .filter((s) => !memberIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

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
    if (!selectedGroupId) return;
    updateMembership(selectedGroupId, school.id, true);
    startTransition(() => addSchoolToBillingGroup(school.id, selectedGroupId));
  }

  function handleRemove(school: School) {
    if (!selectedGroupId) return;
    updateMembership(selectedGroupId, school.id, false);
    startTransition(() => removeSchoolFromBillingGroup(school.id, selectedGroupId));
  }

  function openCreate() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(g: BillingGroup) { setEditing(g); setName(g.name); setOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) await updateBillingGroup(editing.id, { name });
    else await createBillingGroup({ name });
    setOpen(false);
  }

  return (
    <>
      <div className="flex gap-6 min-h-[500px]">
        {/* Left: group list */}
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
                  onClick={() => { setSelectedGroupId(g.id); setSearch(""); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 border-b last:border-b-0 transition-colors",
                    selectedGroupId === g.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="truncate">{g.name}</span>
                  <span className={cn("text-xs shrink-0", selectedGroupId === g.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: school assignment */}
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
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { if (confirm("Delete this group?")) deleteBillingGroup(selectedGroup.id); }}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 flex-1 min-h-0">
                {/* Assigned schools */}
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

                {/* Available schools */}
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
          <DialogHeader><DialogTitle>{editing ? "Edit Group" : "Add Billing Group"}</DialogTitle></DialogHeader>
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
