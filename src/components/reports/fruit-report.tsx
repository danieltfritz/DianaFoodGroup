import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FruitReportRow } from "@/lib/reports";

export function FruitReport({ rows }: { rows: FruitReportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No fruit items found for this date range.
      </p>
    );
  }

  // Group by date
  const byDate = new Map<string, FruitReportRow[]>();
  for (const row of rows) {
    const key = row.date.toISOString().split("T")[0];
    (byDate.get(key) ?? byDate.set(key, []).get(key)!).push(row);
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {Array.from(byDate.entries()).map(([dateStr, dateRows]) => {
        const d = new Date(dateStr + "T00:00:00");
        const label = d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return (
          <div key={dateStr} className="space-y-2">
            <h2 className="font-semibold text-base border-b pb-1">{label}</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Fruit Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateRows.map((row) =>
                    row.items.map((item, i) => (
                      <TableRow key={`${row.schoolName}-${item.foodName}`}>
                        <TableCell className={i > 0 ? "text-muted-foreground" : "font-medium"}>
                          {i === 0 ? row.schoolName : ""}
                        </TableCell>
                        <TableCell className={i > 0 ? "" : "text-muted-foreground"}>
                          {i === 0 ? (row.route ?? "—") : ""}
                        </TableCell>
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
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground text-right">
        {rows.length} school-day records · {rows.reduce((s, r) => s + r.items.length, 0)} fruit servings
      </p>
    </div>
  );
}
