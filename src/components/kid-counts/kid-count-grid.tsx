"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { upsertKidCount, createMenuOverride, deleteMenuOverride } from "@/lib/actions/kid-counts";

type AgeGroup = { id: number; name: string };
type Meal = { id: number; name: string };
type SchoolRow = {
  schoolId: number;
  schoolName: string;
  schoolMenuId: number;
  menuName: string;
  isClosed: boolean;
  startDate: Date;
  endDate: Date | null;
  counts: Record<string, number>; // `${mealId}-${ageGroupId}`
};

interface KidCountGridProps {
  schools: SchoolRow[];
  meals: Meal[];
  ageGroups: AgeGroup[];
}


export function KidCountGrid({ schools, meals, ageGroups }: KidCountGridProps) {
  const router = useRouter();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("all");
  const [selectedMealId, setSelectedMealId] = useState<string>("all");

  // Override state
  const [overrideStart, setOverrideStart] = useState<string>("");
  const [overrideEnd, setOverrideEnd] = useState<string>("");
  const [overrideError, setOverrideError] = useState<string>("");
  const [overriding, startOverrideTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();

  const menuOptions = selectedSchoolId === "all"
    ? []
    : schools
        .filter((s) => String(s.schoolId) === selectedSchoolId)
        .map((s) => ({
          value: String(s.schoolMenuId),
          label: s.endDate
            ? `${s.menuName} ${s.startDate.toLocaleDateString()} – ${s.endDate.toLocaleDateString()}`
            : s.menuName,
        }));

  const displayedSchools = schools
    .filter((s) => selectedSchoolId === "all" || String(s.schoolId) === selectedSchoolId)
    .filter((s) => selectedMenuId === "all" || String(s.schoolMenuId) === selectedMenuId);

  const displayedMeals = selectedMealId === "all"
    ? meals
    : meals.filter((m) => String(m.id) === selectedMealId);

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    schools.forEach((s) => {
      Object.entries(s.counts).forEach(([key, count]) => {
        init[`${s.schoolMenuId}-${key}`] = count;
      });
    });
    return init;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function cellKey(schoolMenuId: number, mealId: number, ageGroupId: number) {
    return `${schoolMenuId}-${mealId}-${ageGroupId}`;
  }

  function handleBlur(school: SchoolRow, mealId: number, ageGroupId: number) {
    const key = cellKey(school.schoolMenuId, mealId, ageGroupId);
    const count = values[key] ?? 0;
    setSaving((s) => ({ ...s, [key]: true }));
    startTransition(async () => {
      await upsertKidCount({
        schoolId: school.schoolId,
        schoolMenuId: school.schoolMenuId,
        mealId,
        ageGroupId,
        count,
      });
      setSaving((s) => ({ ...s, [key]: false }));
    });
  }

  function handleDelete() {
    const school = displayedSchools[0];
    if (!school) return;
    startDeleteTransition(async () => {
      try {
        await deleteMenuOverride(school.schoolMenuId);
        setConfirmDelete(false);
        setSelectedMenuId("all");
        router.refresh();
      } catch (err) {
        setOverrideError(err instanceof Error ? err.message : "Delete failed.");
        setConfirmDelete(false);
      }
    });
  }

  function handleOverride() {
    setOverrideError("");
    if (!overrideStart || !overrideEnd) {
      setOverrideError("Both start and end dates are required.");
      return;
    }
    if (new Date(overrideStart) >= new Date(overrideEnd)) {
      setOverrideError("Start date must be before end date.");
      return;
    }
    const school = displayedSchools[0];
    if (!school) {
      setOverrideError("No menu selected.");
      return;
    }
    startOverrideTransition(async () => {
      try {
        await createMenuOverride({
          schoolId: school.schoolId,
          sourceSchoolMenuId: school.schoolMenuId,
          startDate: new Date(`${overrideStart}T12:00:00`),
          endDate: new Date(`${overrideEnd}T12:00:00`),
        });
        setOverrideStart("");
        setOverrideEnd("");
        setSelectedMenuId("all");
        router.refresh();
      } catch (err) {
        setOverrideError(err instanceof Error ? err.message : "Override failed.");
      }
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
  const showOverridePanel = selectedSchoolId !== "all" && selectedMenuId !== "all";
  const selectedMenu = displayedSchools[0] ?? null;
  const isOverride = selectedMenu?.endDate != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">School</label>
        <Combobox
          className="w-64"
          value={selectedSchoolId}
          onValueChange={(v) => {
            setSelectedSchoolId(v || "all");
            setSelectedMenuId("all");
          }}
          options={[
            { value: "all", label: "All Schools" },
            ...Array.from(new Map(schools.map((s) => [s.schoolId, s])).values())
              .map((s) => ({ value: String(s.schoolId), label: s.schoolName })),
          ]}
          placeholder="All Schools"
        />

        {menuOptions.length > 0 && (
          <>
            <label className="text-sm font-medium ml-4">Menu</label>
            <Combobox
              className="w-52"
              value={selectedMenuId}
              onValueChange={(v) => setSelectedMenuId(v || "all")}
              options={[
                { value: "all", label: "All Menus" },
                ...menuOptions,
              ]}
              placeholder="All Menus"
            />
          </>
        )}

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

      {showOverridePanel && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border bg-muted/30 px-4 py-3">
          {isOverride ? (
            <>
              <span className="text-sm font-medium text-destructive">Delete this override?</span>
              {confirmDelete ? (
                <>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete Override
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm font-medium">Override date range:</span>
              <Input
                type="date"
                className="w-40 h-8 text-sm"
                value={overrideStart}
                onChange={(e) => setOverrideStart(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                className="w-40 h-8 text-sm"
                value={overrideEnd}
                onChange={(e) => setOverrideEnd(e.target.value)}
              />
              <Button size="sm" onClick={handleOverride} disabled={overriding}>
                {overriding ? "Creating…" : "Override"}
              </Button>
            </>
          )}
          {overrideError && (
            <span className="text-sm text-destructive">{overrideError}</span>
          )}
        </div>
      )}

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
                return sum + (values[cellKey(school.schoolMenuId, meal.id, ageGroup.id)] ?? 0);
              }, 0);

              return (
                <TableRow key={school.schoolMenuId} className={school.isClosed ? "opacity-40" : ""}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="cursor-pointer hover:underline"
                        onClick={() => {
                          setSelectedSchoolId(String(school.schoolId));
                          setSelectedMenuId(String(school.schoolMenuId));
                        }}
                      >
                        <div>{school.schoolName}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {school.menuName}
                          {school.endDate && (
                            <span> {school.startDate.toLocaleDateString()} – {school.endDate.toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {school.isClosed && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                    </div>
                  </TableCell>
                  {cols.map(({ meal, ageGroup }) => {
                    const key = cellKey(school.schoolMenuId, meal.id, ageGroup.id);
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
    </div>
  );
}
