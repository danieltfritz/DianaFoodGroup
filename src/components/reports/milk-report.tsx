import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MilkSchoolRow } from "@/lib/reports";

const TIER_LABELS: Record<string, string> = {
  small: "Small (+65%)",
  medium: "Medium (+50%)",
  large: "Large (+5%)",
};

export function MilkReport({ rows }: { rows: MilkSchoolRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No milk data for this date.
      </p>
    );
  }

  const grandTotalRaw = rows.reduce(
    (s, r) => s + r.items.reduce((ss, i) => ss + i.rawAmount, 0),
    0
  );
  const grandTotalOrdered = rows.reduce(
    (s, r) => s + r.items.reduce((ss, i) => ss + i.orderedAmount, 0),
    0
  );

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Milk Item</TableHead>
              <TableHead className="text-right">Raw Amount</TableHead>
              <TableHead className="text-right">After Overage</TableHead>
              <TableHead className="text-right">Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((school) =>
              school.items.map((item, idx) => (
                <TableRow key={`${school.schoolId}-${item.foodId}-${item.mealName}`}>
                  {idx === 0 && (
                    <TableCell className="font-medium align-top" rowSpan={school.items.length}>
                      {school.schoolName}
                    </TableCell>
                  )}
                  {idx === 0 && (
                    <TableCell className="text-muted-foreground text-sm align-top" rowSpan={school.items.length}>
                      {school.route ?? "—"}
                    </TableCell>
                  )}
                  {idx === 0 && (
                    <TableCell className="align-top" rowSpan={school.items.length}>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {TIER_LABELS[school.milkTier] ?? school.milkTier}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>{item.mealName}</TableCell>
                  <TableCell>{item.foodName}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.rawAmount.toFixed(2)} {item.pkUnit ?? ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.orderedAmount.toFixed(2)} {item.pkUnit ?? ""}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.orderedUnits !== null
                      ? `${item.orderedUnits} ${item.pkUnit ?? "units"}`
                      : `${item.orderedAmount.toFixed(2)} ${item.pkUnit ?? ""}`}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-right text-muted-foreground space-x-4">
        <span>Raw total: <strong>{grandTotalRaw.toFixed(2)}</strong></span>
        <span>Ordered total: <strong>{grandTotalOrdered.toFixed(2)}</strong></span>
        <span>{rows.length} schools</span>
      </div>
    </div>
  );
}
