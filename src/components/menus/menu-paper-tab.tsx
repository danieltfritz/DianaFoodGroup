"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PaperItem = { id: number; name: string };
type PaperSize = { id: number; name: string | null };
type Meal = { id: number; name: string };
type AgeGroup = { id: number; name: string };

type MenuPaperItem = {
  id: number;
  schoolId: number | null;
  week: number;
  dayId: number;
  mealId: number;
  ageGroupId: number;
  paperId: number;
  paperSizeId: number | null;
  paperQty: number;
  isAlways: boolean;
};

interface MenuPaperTabProps {
  cycleWeeks: number;
  items: MenuPaperItem[];
  paperItems: PaperItem[];
  paperSizes: PaperSize[];
  meals: Meal[];
  ageGroups: AgeGroup[];
}

export function MenuPaperTab({ cycleWeeks, items, paperItems, paperSizes, meals, ageGroups }: MenuPaperTabProps) {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMealId, setSelectedMealId] = useState<number | "all">("all");

  const paperMap = Object.fromEntries(paperItems.map((p) => [p.id, p.name]));
  const sizeMap = Object.fromEntries(paperSizes.map((s) => [s.id, s.name]));
  const mealMap = Object.fromEntries(meals.map((m) => [m.id, m.name]));
  const ageMap = Object.fromEntries(ageGroups.map((a) => [a.id, a.name]));

  const weekItems = items.filter(
    (i) => i.week === selectedWeek && (selectedMealId === "all" || i.mealId === selectedMealId)
  );

  const days = [...new Set(weekItems.map((i) => i.dayId))].sort((a, b) => a - b);

  function paperLabel(item: MenuPaperItem) {
    const name = paperMap[item.paperId] ?? `Paper#${item.paperId}`;
    const size = item.paperSizeId ? sizeMap[item.paperSizeId] : null;
    return size ? `${name} (${size})` : name;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {Array.from({ length: cycleWeeks }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1 rounded text-sm border transition-colors ${selectedWeek === w ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              Week {w}
            </button>
          ))}
        </div>
        <select
          value={selectedMealId}
          onChange={(e) => setSelectedMealId(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="text-sm border rounded px-2 py-1 bg-background"
        >
          <option value="all">All Meals</option>
          {meals.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{weekItems.length} assignments</span>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No paper assignments for this week/meal.</p>
      ) : (
        <div className="space-y-4">
          {days.map((dayId) => {
            const dayRows = weekItems.filter((i) => i.dayId === dayId);
            return (
              <div key={dayId}>
                <p className="text-sm font-semibold mb-1">{DAY_NAMES[dayId] ?? `Day ${dayId}`}</p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paper Item</TableHead>
                        <TableHead>Meal</TableHead>
                        <TableHead>Age Group</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>School</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm">{paperLabel(row)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{mealMap[row.mealId] ?? row.mealId}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ageMap[row.ageGroupId] ?? row.ageGroupId}</TableCell>
                          <TableCell className="text-sm text-right">{row.paperQty || "—"}</TableCell>
                          <TableCell>
                            {row.schoolId ? (
                              <Badge variant="outline" className="text-xs">School #{row.schoolId}</Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
