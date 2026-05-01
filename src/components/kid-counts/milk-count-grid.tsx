"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { upsertMilkCount } from "@/lib/actions/kid-counts";

type AgeGroup = { id: number; name: string };
type Meal = { id: number; name: string };
type MilkType = { id: number; name: string; labelColor: string };
type SchoolRow = {
  schoolId: number;
  schoolName: string;
  schoolMenuId: number;
  menuName: string;
  isClosed: boolean;
  milkCounts: Record<string, number>; // `${mealId}-${ageGroupId}-${milkTypeId}`
};

interface MilkCountGridProps {
  schools: SchoolRow[];
  meals: Meal[];
  ageGroups: AgeGroup[];
  milkTypes: MilkType[];
}


export function MilkCountGrid({ schools, meals, ageGroups, milkTypes }: MilkCountGridProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedMealId, setSelectedMealId] = useState<string>("all");
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string>("all");

  const displayedSchools = selectedSchoolId === "all"
    ? schools
    : schools.filter((s) => String(s.schoolId) === selectedSchoolId);

  const displayedMeals = selectedMealId === "all"
    ? meals
    : meals.filter((m) => String(m.id) === selectedMealId);

  const displayedAgeGroups = selectedAgeGroupId === "all"
    ? ageGroups
    : ageGroups.filter((a) => String(a.id) === selectedAgeGroupId);

  const [milkValues, setMilkValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    schools.forEach((s) => {
      Object.entries(s.milkCounts).forEach(([key, count]) => {
        init[`${s.schoolMenuId}-${key}`] = count;
      });
    });
    return init;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function cellKey(schoolMenuId: number, mealId: number, ageGroupId: number, milkTypeId: number) {
    return `${schoolMenuId}-${mealId}-${ageGroupId}-${milkTypeId}`;
  }

  function handleBlur(school: SchoolRow, mealId: number, ageGroupId: number, milkTypeId: number) {
    const key = cellKey(school.schoolMenuId, mealId, ageGroupId, milkTypeId);
    const count = milkValues[key] ?? 0;
    setSaving((s) => ({ ...s, [key]: true }));
    startTransition(async () => {
      await upsertMilkCount({
        schoolId: school.schoolId,
        schoolMenuId: school.schoolMenuId,
        mealId,
        ageGroupId,
        milkTypeId,
        count,
      });
      setSaving((s) => ({ ...s, [key]: false }));
    });
  }

  if (schools.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No schools have active menus.
      </p>
    );
  }

  // All leaf columns: meal × ageGroup × milkType
  const leafCols = displayedMeals.flatMap((meal) =>
    displayedAgeGroups.flatMap((ageGroup) =>
      milkTypes.map((milkType) => ({ meal, ageGroup, milkType }))
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">School</label>
        <Combobox
          className="w-64"
          value={selectedSchoolId}
          onValueChange={(v) => setSelectedSchoolId(v || "all")}
          options={[
            { value: "all", label: "All Schools" },
            ...Array.from(new Map(schools.map((s) => [s.schoolId, s])).values())
              .map((s) => ({ value: String(s.schoolId), label: s.schoolName })),
          ]}
          placeholder="All Schools"
        />
        <label className="text-sm font-medium ml-4">Meal</label>
        <Combobox
          className="w-44"
          value={selectedMealId}
          onValueChange={(v) => setSelectedMealId(v || "all")}
          options={[
            { value: "all", label: "All Meals" },
            ...meals.map((m) => ({ value: String(m.id), label: m.name })),
          ]}
          placeholder="All Meals"
        />
        <label className="text-sm font-medium ml-4">Age Group</label>
        <Combobox
          className="w-44"
          value={selectedAgeGroupId}
          onValueChange={(v) => setSelectedAgeGroupId(v || "all")}
          options={[
            { value: "all", label: "All Ages" },
            ...ageGroups.map((a) => ({ value: String(a.id), label: a.name })),
          ]}
          placeholder="All Ages"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {/* Row 1: Meal groups */}
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-48" rowSpan={4}>School</TableHead>
              {displayedMeals.map((m) => (
                <TableHead
                  key={m.id}
                  colSpan={displayedAgeGroups.length * milkTypes.length}
                  className="text-center border-l"
                >
                  {m.name}
                </TableHead>
              ))}
              <TableHead className="text-center border-l" rowSpan={4}>Total</TableHead>
            </TableRow>
            {/* Row 2: Age group groups */}
            <TableRow>
              {displayedMeals.flatMap((m) =>
                displayedAgeGroups.map((ag) => (
                  <TableHead
                    key={`${m.id}-${ag.id}`}
                    colSpan={milkTypes.length}
                    className="text-center text-xs border-l"
                  >
                    {ag.name}
                  </TableHead>
                ))
              )}
            </TableRow>
            {/* Row 3: Milk type names */}
            <TableRow>
              {displayedMeals.flatMap((m) =>
                displayedAgeGroups.flatMap((ag) =>
                  milkTypes.map((mt) => (
                    <TableHead
                      key={`${m.id}-${ag.id}-${mt.id}`}
                      className="text-center text-xs font-normal min-w-14"
                    >
                      {mt.name}
                    </TableHead>
                  ))
                )
              )}
            </TableRow>
            {/* Row 4: Milk type label colors */}
            <TableRow>
              {displayedMeals.flatMap((m) =>
                displayedAgeGroups.flatMap((ag) =>
                  milkTypes.map((mt) => (
                    <TableHead
                      key={`${m.id}-${ag.id}-${mt.id}-color`}
                      className="text-center text-xs font-normal min-w-14 text-muted-foreground"
                    >
                      {mt.labelColor}
                    </TableHead>
                  ))
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedSchools.map((school) => {
              if (school.isClosed) return null;

              const total = leafCols.reduce((sum, { meal, ageGroup, milkType }) =>
                sum + (milkValues[cellKey(school.schoolMenuId, meal.id, ageGroup.id, milkType.id)] ?? 0), 0
              );

              return (
                <TableRow key={school.schoolMenuId}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div
                      className="cursor-pointer hover:underline"
                      onClick={() => setSelectedSchoolId(String(school.schoolId))}
                    >
                      <div>{school.schoolName}</div>
                      <div className="text-xs text-muted-foreground font-normal">{school.menuName}</div>
                    </div>
                  </TableCell>
                  {leafCols.map(({ meal, ageGroup, milkType }) => {
                    const key = cellKey(school.schoolMenuId, meal.id, ageGroup.id, milkType.id);
                    return (
                      <TableCell key={key} className="p-1 text-center">
                        <Input
                          type="number"
                          min={0}
                          className={`h-7 w-14 text-center text-sm mx-auto ${saving[key] ? "opacity-50" : ""}`}
                          value={milkValues[key] ?? 0}
                          onChange={(e) => setMilkValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                          onBlur={() => handleBlur(school, meal.id, ageGroup.id, milkType.id)}
                        />
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
    </div>
  );
}
