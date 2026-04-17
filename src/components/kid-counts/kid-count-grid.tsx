"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { upsertKidCount } from "@/lib/actions/kid-counts";

type AgeGroup = { id: number; name: string };
type Meal = { id: number; name: string };
type SchoolRow = {
  schoolId: number;
  schoolName: string;
  schoolMenuId: number;
  isClosed: boolean;
  counts: Record<string, number>; // key: `${mealId}-${ageGroupId}`
};

interface KidCountGridProps {
  date: string;
  schools: SchoolRow[];
  meals: Meal[];
  ageGroups: AgeGroup[];
}

export function KidCountGrid({ date, schools, meals, ageGroups }: KidCountGridProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    schools.forEach((s) => {
      Object.entries(s.counts).forEach(([key, count]) => {
        init[`${s.schoolId}-${key}`] = count;
      });
    });
    return init;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function cellKey(schoolId: number, mealId: number, ageGroupId: number) {
    return `${schoolId}-${mealId}-${ageGroupId}`;
  }

  function handleBlur(school: SchoolRow, mealId: number, ageGroupId: number) {
    const key = cellKey(school.schoolId, mealId, ageGroupId);
    const count = values[key] ?? 0;
    setSaving((s) => ({ ...s, [key]: true }));
    startTransition(async () => {
      await upsertKidCount({
        schoolId: school.schoolId,
        schoolMenuId: school.schoolMenuId,
        date: new Date(date),
        mealId,
        ageGroupId,
        count,
      });
      setSaving((s) => ({ ...s, [key]: false }));
    });
  }

  if (schools.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No schools are scheduled for delivery on this date.
      </p>
    );
  }

  // Build column headers: meal × age group pairs
  const cols = meals.flatMap((m) => ageGroups.map((a) => ({ meal: m, ageGroup: a })));

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-48">School</TableHead>
            {meals.map((m) => (
              <TableHead
                key={m.id}
                colSpan={ageGroups.length}
                className="text-center border-l"
              >
                {m.name}
              </TableHead>
            ))}
            <TableHead className="text-center border-l">Total</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10" />
            {cols.map(({ meal, ageGroup }) => (
              <TableHead key={`${meal.id}-${ageGroup.id}`} className="text-center text-xs font-normal min-w-20">
                {ageGroup.name}
              </TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.map((school) => {
            const total = cols.reduce((sum, { meal, ageGroup }) => {
              return sum + (values[cellKey(school.schoolId, meal.id, ageGroup.id)] ?? 0);
            }, 0);

            return (
              <TableRow key={school.schoolId} className={school.isClosed ? "opacity-40" : ""}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">
                  <div className="flex items-center gap-2">
                    {school.schoolName}
                    {school.isClosed && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                  </div>
                </TableCell>
                {cols.map(({ meal, ageGroup }) => {
                  const key = cellKey(school.schoolId, meal.id, ageGroup.id);
                  return (
                    <TableCell key={key} className="p-1 text-center">
                      {school.isClosed ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          className={`h-7 w-16 text-center text-sm mx-auto ${saving[key] ? "opacity-50" : ""}`}
                          value={values[key] ?? 0}
                          onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                          onBlur={() => handleBlur(school, meal.id, ageGroup.id)}
                        />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-semibold border-l">{total}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
