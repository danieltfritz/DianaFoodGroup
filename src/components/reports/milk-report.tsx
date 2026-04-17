import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MilkSchoolRow } from "@/lib/reports";

export function MilkReport({ rows }: { rows: MilkSchoolRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No milk data for this date.
      </p>
    );
  }

  const grandTotal = rows.reduce(
    (s, r) => s + r.items.reduce((ss, i) => ss + i.totalAmount, 0),
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
              <TableHead>Meal</TableHead>
              <TableHead>Milk Item</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((school) =>
              school.items.map((item, idx) => (
                <TableRow key={`${school.schoolId}-${item.foodId}-${item.mealName}`}>
                  {idx === 0 ? (
                    <TableCell
                      className="font-medium align-top"
                      rowSpan={school.items.length}
                    >
                      {school.schoolName}
                    </TableCell>
                  ) : null}
                  {idx === 0 ? (
                    <TableCell
                      className="text-muted-foreground text-sm align-top"
                      rowSpan={school.items.length}
                    >
                      {school.route ?? "—"}
                    </TableCell>
                  ) : null}
                  <TableCell>{item.mealName}</TableCell>
                  <TableCell>{item.foodName}</TableCell>
                  <TableCell className="text-right">
                    {item.totalAmount.toFixed(2)} {item.pkUnit ?? ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-right text-muted-foreground">
        {rows.length} schools &bull; {grandTotal.toFixed(2)} total milk units
      </p>
    </div>
  );
}
