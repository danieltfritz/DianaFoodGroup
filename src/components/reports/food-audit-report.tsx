import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionItem } from "@/lib/production";
import { formatPacks } from "@/lib/containers";

export function FoodAuditReport({ items }: { items: ProductionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production data for this date.
      </p>
    );
  }

  const hot = items.filter((i) => i.tempType === "hot");
  const cold = items.filter((i) => i.tempType === "cold");

  const grandTotal = items.reduce((s, i) => s + i.totalAmount, 0);

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
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Containers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.map((item) => (
                    <TableRow key={item.foodId}>
                      <TableCell className="font-medium">{item.foodName}</TableCell>
                      <TableCell className="text-right">
                        {item.totalAmount.toFixed(2)} {item.pkUnit ?? ""}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {formatPacks(item.packs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null
      )}

      <div className="text-sm text-right text-muted-foreground">
        {items.length} item types &bull; Grand total serving units: {grandTotal.toFixed(2)}
      </div>
    </div>
  );
}
