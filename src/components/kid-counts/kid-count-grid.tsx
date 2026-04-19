"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { upsertKidCount, upsertMilkCount } from "@/lib/actions/kid-counts";

type AgeGroup = { id: number; name: string };
type Meal = { id: number; name: string };
type MilkType = { id: number; name: string; labelColor: string };
type SchoolRow = {
  schoolId: number;
  schoolName: string;
  schoolMenuId: number;
  isClosed: boolean;
  counts: Record<string, number>;     // `${mealId}-${ageGroupId}`
  milkCounts: Record<string, number>; // `${mealId}-${milkTypeId}`
};

interface KidCountGridProps {
  date: string;
  schools: SchoolRow[];
  meals: Meal[];
  ageGroups: AgeGroup[];
  milkTypes: MilkType[];
}

export function KidCountGrid({ date, schools, meals, ageGroups, milkTypes }: KidCountGridProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedMealId, setSelectedMealId] = useState<string>("all");

  const displayedSchools = selectedSchoolId === "all"
    ? schools
    : schools.filter((s) => String(s.schoolId) === selectedSchoolId);

  const displayedMeals = selectedMealId === "all"
    ? meals
    : meals.filter((m) => String(m.id) === selectedMealId);

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    schools.forEach((s) => {
      Object.entries(s.counts).forEach(([key, count]) => {
        init[`${s.schoolId}-${key}`] = count;
      });
    });
    return init;
  });

  const [milkValues, setMilkValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    schools.forEach((s) => {
      Object.entries(s.milkCounts).forEach(([key, count]) => {
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

  function milkKey(schoolId: number, mealId: number, milkTypeId: number) {
    return `${schoolId}-${mealId}-${milkTypeId}`;
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

  function handleMilkBlur(school: SchoolRow, mealId: number, milkTypeId: number) {
    const key = milkKey(school.schoolId, mealId, milkTypeId);
    const count = milkValues[key] ?? 0;
    setSaving((s) => ({ ...s, [key]: true }));
    startTransition(async () => {
      await upsertMilkCount({
        schoolId: school.schoolId,
        date: new Date(date),
        mealId,
        milkTypeId,
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

  const cols = displayedMeals.flatMap((m) => ageGroups.map((a) => ({ meal: m, ageGroup: a })));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">School</label>
        <Combobox
          className="w-64"
          value={selectedSchoolId}
          onValueChange={(v) => setSelectedSchoolId(v || "all")}
          options={[
            { value: "all", label: "All Schools" },
            ...schools.map((s) => ({ value: String(s.schoolId), label: s.schoolName })),
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
      </div>

      {/* Kid Count Grid */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-48">School</TableHead>
              {displayedMeals.map((m) => (
                <TableHead key={m.id} colSpan={ageGroups.length} className="text-center border-l">
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
            {displayedSchools.map((school) => {
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

      {/* Milk Count Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Milk Counts</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Enter milk counts per meal. Total milk should equal total kids per meal.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-48">School</TableHead>
                {displayedMeals.map((m) => (
                  <TableHead key={m.id} colSpan={milkTypes.length} className="text-center border-l">
                    {m.name}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10" />
                {displayedMeals.flatMap((m) =>
                  milkTypes.map((mt) => (
                    <TableHead key={`${m.id}-${mt.id}`} className="text-center text-xs font-normal min-w-16">
                      {mt.name}
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSchools.map((school) => {
                if (school.isClosed) return null;

                return (
                  <TableRow key={school.schoolId}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      <MilkValidationCell
                        school={school}
                        meals={displayedMeals}
                        ageGroups={ageGroups}
                        milkTypes={milkTypes}
                        values={values}
                        milkValues={milkValues}
                      />
                    </TableCell>
                    {displayedMeals.flatMap((m) =>
                      milkTypes.map((mt) => {
                        const key = milkKey(school.schoolId, m.id, mt.id);
                        return (
                          <TableCell key={key} className="p-1 text-center">
                            <Input
                              type="number"
                              min={0}
                              className={`h-7 w-14 text-center text-sm mx-auto ${saving[key] ? "opacity-50" : ""}`}
                              value={milkValues[key] ?? 0}
                              onChange={(e) => setMilkValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                              onBlur={() => handleMilkBlur(school, m.id, mt.id)}
                            />
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function MilkValidationCell({
  school,
  meals,
  ageGroups,
  milkTypes,
  values,
  milkValues,
}: {
  school: SchoolRow;
  meals: Meal[];
  ageGroups: AgeGroup[];
  milkTypes: MilkType[];
  values: Record<string, number>;
  milkValues: Record<string, number>;
}) {
  const warnings: string[] = [];

  for (const m of meals) {
    const kidTotal = ageGroups.reduce((sum, ag) => {
      return sum + (values[`${school.schoolId}-${m.id}-${ag.id}`] ?? 0);
    }, 0);
    const milkTotal = milkTypes.reduce((sum, mt) => {
      return sum + (milkValues[`${school.schoolId}-${m.id}-${mt.id}`] ?? 0);
    }, 0);
    if (kidTotal > 0 && milkTotal !== kidTotal) {
      warnings.push(`${m.name}: ${milkTotal}/${kidTotal}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span>{school.schoolName}</span>
      {warnings.length > 0 && (
        <Badge variant="destructive" className="text-xs" title={warnings.join(", ")}>
          ⚠ {warnings.join(", ")}
        </Badge>
      )}
    </div>
  );
}
