import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyKidCountReport } from "@/lib/reports";

export function DailyKidCountReport({ data }: { data: DailyKidCountReport }) {
  if (data.sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No kid count data for this date.
      </p>
    );
  }

  const { ageGroups, sections, grandTotals, grandTotal } = data;

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Menu / Meal</TableHead>
              {ageGroups.map((ag) => (
                <TableHead key={ag.id} className="text-right whitespace-nowrap">{ag.name}</TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <>
                <TableRow key={`menu-${section.menuId}-header`} className="bg-muted/50">
                  <TableCell colSpan={ageGroups.length + 2} className="text-xs font-semibold text-muted-foreground py-1.5 px-4">
                    {section.menuName}
                  </TableCell>
                </TableRow>
                {section.meals.map((meal) => (
                  <TableRow key={`${section.menuId}-${meal.mealId}`}>
                    <TableCell className="pl-6 text-sm">{meal.mealName}</TableCell>
                    {ageGroups.map((ag) => (
                      <TableCell key={ag.id} className="text-right text-sm">
                        {meal.counts[ag.id] || ""}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-sm font-medium">{meal.total || ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow key={`menu-${section.menuId}-totals`} className="font-semibold border-t">
                  <TableCell className="pl-4">Totals</TableCell>
                  {ageGroups.map((ag) => (
                    <TableCell key={ag.id} className="text-right">
                      {section.totals[ag.id] || ""}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{section.grandTotal || ""}</TableCell>
                </TableRow>
              </>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell>Totals</TableCell>
              {ageGroups.map((ag) => (
                <TableCell key={ag.id} className="text-right">{grandTotals[ag.id] || ""}</TableCell>
              ))}
              <TableCell className="text-right">{grandTotal || ""}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-right text-muted-foreground">{sections.length} menu{sections.length !== 1 ? "s" : ""} &middot; {grandTotal.toLocaleString()} total kids</p>
    </div>
  );
}
