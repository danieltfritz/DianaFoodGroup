"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type School = { id: number; name: string };
type PaperGroup = { id: number; name: string; schools: { schoolId: number }[] };

interface PaperGroupsTabProps {
  groups: PaperGroup[];
  schoolMap: Record<number, string>;
}

export function PaperGroupsTab({ groups, schoolMap }: PaperGroupsTabProps) {
  const [selectedId, setSelectedId] = useState<number | null>(groups[0]?.id ?? null);
  const selected = groups.find((g) => g.id === selectedId);
  const assignedSchools: School[] = (selected?.schools ?? [])
    .map((s) => ({ id: s.schoolId, name: schoolMap[s.schoolId] ?? String(s.schoolId) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Paper Delivery Groups</h3>
      <div className="flex gap-4 min-h-[300px]">
        <div className="w-56 shrink-0 rounded-md border overflow-auto">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedId(g.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${selectedId === g.id ? "bg-muted font-medium" : ""}`}
            >
              <span className="truncate">{g.name}</span>
              <Badge variant="secondary" className="shrink-0 text-xs">{g.schools.length}</Badge>
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground p-3">No groups. Run the PG2 import script.</p>
          )}
        </div>

        <div className="flex-1 rounded-md border overflow-auto">
          {selected ? (
            <div>
              <div className="px-4 py-2 border-b bg-muted/30">
                <p className="font-medium text-sm">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{assignedSchools.length} school{assignedSchools.length !== 1 ? "s" : ""}</p>
              </div>
              <ul className="divide-y">
                {assignedSchools.map((s) => (
                  <li key={s.id} className="px-4 py-1.5 text-sm">{s.name}</li>
                ))}
                {assignedSchools.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">No schools assigned.</li>
                )}
              </ul>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Select a group to see assigned schools.</p>
          )}
        </div>
      </div>
    </div>
  );
}
