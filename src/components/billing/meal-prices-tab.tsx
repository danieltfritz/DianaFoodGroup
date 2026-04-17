"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { upsertMealPrice } from "@/lib/actions/billing";

type BillingGroup = { id: number; name: string };
type Meal = { id: number; name: string };
type AgeGroup = { id: number; name: string };
type SchoolRow = {
  schoolId: number;
  schoolName: string;
  schoolMenuId: number;
  prices: Record<string, number>; // `${mealId}-${ageGroupId}` → price
};

export function MealPricesTab({
  groups,
  meals,
  ageGroups,
  schoolRows,
}: {
  groups: BillingGroup[];
  meals: Meal[];
  ageGroups: AgeGroup[];
  schoolRows: SchoolRow[];
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]?.id.toString() ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    schoolRows.forEach((s) => {
      Object.entries(s.prices).forEach(([key, price]) => {
        init[`${s.schoolId}-${key}`] = price.toFixed(2);
      });
    });
    return init;
  });
  const [, startTransition] = useTransition();

  const groupId = Number(selectedGroup);
  const filtered = schoolRows.filter((s) =>
    groupId ? true : true // all shown; filter would need billingGroupId on schoolRow
  );

  function cellKey(schoolId: number, mealId: number, ageGroupId: number) {
    return `${schoolId}-${mealId}-${ageGroupId}`;
  }

  function handleBlur(school: SchoolRow, mealId: number, ageGroupId: number) {
    const key = cellKey(school.schoolId, mealId, ageGroupId);
    const price = parseFloat(values[key] ?? "0") || 0;
    startTransition(async () => {
      await upsertMealPrice({
        schoolMenuId: school.schoolMenuId,
        schoolId: school.schoolId,
        mealId,
        ageGroupId,
        price,
      });
    });
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Add a billing group first.</p>;
  }

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No schools with active menu assignments.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Billing Group:</span>
        <Select value={selectedGroup} onValueChange={(v) => v && setSelectedGroup(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">Tab away from a cell to save. Prices are per kid per meal.</p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background min-w-48">School</TableHead>
              {meals.map((m) => (
                <TableHead key={m.id} colSpan={ageGroups.length} className="text-center border-l">
                  {m.name}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead className="sticky left-0 bg-background" />
              {meals.flatMap((m) =>
                ageGroups.map((a) => (
                  <TableHead key={`${m.id}-${a.id}`} className="text-center text-xs font-normal min-w-24">
                    {a.name}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((school) => (
              <TableRow key={school.schoolId}>
                <TableCell className="sticky left-0 bg-background font-medium">{school.schoolName}</TableCell>
                {meals.flatMap((meal) =>
                  ageGroups.map((ag) => {
                    const key = cellKey(school.schoolId, meal.id, ag.id);
                    return (
                      <TableCell key={key} className="p-1 text-center">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-7 w-20 text-right text-sm pl-5 mx-auto"
                            value={values[key] ?? "0.00"}
                            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                            onBlur={() => handleBlur(school, meal.id, ag.id)}
                          />
                        </div>
                      </TableCell>
                    );
                  })
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
