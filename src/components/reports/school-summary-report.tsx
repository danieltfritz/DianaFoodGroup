import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SchoolSummaryRow } from "@/lib/reports";

export function SchoolSummaryReport({ rows }: { rows: SchoolSummaryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No kid counts entered for this date.
      </p>
    );
  }

  // Only show meals that have at least one count across all schools
  const activeMeals = rows[0].meals.filter((m) =>
    rows.some((r) => r.meals.find((rm) => rm.mealId === m.mealId)?.total ?? 0 > 0)
  );

  const grandTotal = rows.reduce((s, r) => s + r.grandTotal, 0);

  return (
    <div className="space-y-6 print:space-y-4">
      {activeMeals.map((mealTemplate) => {
        const mealRows = rows.map((r) => ({
          ...r,
          meal: r.meals.find((m) => m.mealId === mealTemplate.mealId)!,
        })).filter((r) => r.meal.total > 0);

        const mealTotal = mealRows.reduce((s, r) => s + r.meal.total, 0);
        const activeAgeGroups = mealTemplate.ageGroups.filter((ag) =>
          mealRows.some((r) => r.meal.ageGroups.find((a) => a.ageGroupId === ag.ageGroupId)?.count ?? 0 > 0)
        );

        return (
          <div key={mealTemplate.mealId} className="space-y-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              {mealTemplate.mealName}
              <Badge variant="outline">{mealTotal} kids</Badge>
            </h2>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Route</TableHead>
                    {activeAgeGroups.map((ag) => (
                      <TableHead key={ag.ageGroupId} className="text-right">{ag.ageGroupName}</TableHead>
                    ))}
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mealRows.map((r) => (
                    <TableRow key={r.schoolId} className={r.isClosed ? "opacity-50 line-through" : ""}>
                      <TableCell className="font-medium">{r.schoolName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.route ?? "—"}</TableCell>
                      {activeAgeGroups.map((ag) => {
                        const count = r.meal.ageGroups.find((a) => a.ageGroupId === ag.ageGroupId)?.count ?? 0;
                        return (
                          <TableCell key={ag.ageGroupId} className="text-right">
                            {count || "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold">{r.meal.total}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell>TOTAL</TableCell>
                    <TableCell />
                    {activeAgeGroups.map((ag) => {
                      const total = mealRows.reduce(
                        (s, r) => s + (r.meal.ageGroups.find((a) => a.ageGroupId === ag.ageGroupId)?.count ?? 0),
                        0
                      );
                      return <TableCell key={ag.ageGroupId} className="text-right">{total}</TableCell>;
                    })}
                    <TableCell className="text-right">{mealTotal}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      <p className="text-sm text-right text-muted-foreground">
        {rows.length} schools &bull; {grandTotal} total kids
      </p>
    </div>
  );
}
