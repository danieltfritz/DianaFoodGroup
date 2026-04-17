import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContainerRow } from "@/lib/reports";

export function ContainerCountReport({ rows }: { rows: ContainerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production data for this date.
      </p>
    );
  }

  const hot = rows.filter((r) => r.tempType === "hot");
  const cold = rows.filter((r) => r.tempType === "cold");

  return (
    <div className="space-y-6 print:space-y-4">
      {[
        { label: "Hot Items", group: hot, variant: "destructive" as const },
        { label: "Cold Items", group: cold, variant: "secondary" as const },
      ].map(({ label, group, variant }) =>
        group.length > 0 ? (
          <div key={label} className="space-y-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              {label}
              <Badge variant={variant}>{group.length}</Badge>
            </h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Food Item</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Pack Size</TableHead>
                    <TableHead className="text-right font-semibold">Packs Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.map((row) => (
                    <TableRow key={row.foodId}>
                      <TableCell className="font-medium">{row.foodName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.containerName ?? "—"}
                        {row.containerUnits ? ` (${row.containerUnits})` : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalAmount.toFixed(2)} {row.pkUnit ?? ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.pkSize ? `${row.pkSize} ${row.pkUnit ?? ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {row.packsNeeded ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
