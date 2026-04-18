import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionSummarySection } from "@/lib/reports";

function fmt(n: number | undefined) {
  return n !== undefined && n > 0 ? n.toFixed(2) : "—";
}

function MenuSection({ section }: { section: ProductionSummarySection }) {
  const { foodItems, routes } = section;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-base border-b pb-1">{section.menuName}</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">School</TableHead>
              {foodItems.map((fi) => (
                <TableHead key={fi.foodId} className="text-right whitespace-nowrap">
                  {fi.foodName}
                  {fi.pkUnit && <span className="ml-1 text-muted-foreground font-normal text-xs">({fi.pkUnit})</span>}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((rg) => (
              <>
                {/* Route header row */}
                <TableRow key={`route-${rg.routeId}`} className="bg-muted/60">
                  <TableCell colSpan={foodItems.length + 1} className="font-semibold text-sm py-1 px-3">
                    {rg.routeName}
                  </TableCell>
                </TableRow>

                {/* School rows */}
                {rg.schools.map((school) => (
                  <TableRow key={school.schoolName}>
                    <TableCell className="pl-6">{school.schoolName}</TableCell>
                    {foodItems.map((fi) => (
                      <TableCell key={fi.foodId} className="text-right text-sm">
                        {fmt(school.quantities[fi.foodId])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Route totals row */}
                <TableRow key={`total-${rg.routeId}`} className="bg-muted/30 font-semibold text-sm">
                  <TableCell className="pl-6 italic">Route Total</TableCell>
                  {foodItems.map((fi) => (
                    <TableCell key={fi.foodId} className="text-right">
                      {fmt(rg.totals[fi.foodId])}
                    </TableCell>
                  ))}
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ProductionSummaryReport({ sections }: { sections: ProductionSummarySection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production data for this date.
      </p>
    );
  }

  return (
    <div className="space-y-8 print:space-y-6">
      {sections.map((s) => (
        <MenuSection key={s.menuId} section={s} />
      ))}
    </div>
  );
}
