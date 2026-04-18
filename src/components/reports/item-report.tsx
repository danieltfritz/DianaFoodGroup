import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ItemReportSection } from "@/lib/reports";
import { formatPacks } from "@/lib/containers";

function FoodSection({ section }: { section: ItemReportSection }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">
        {section.foodName}
        {section.pkUnit && <span className="ml-1 text-muted-foreground font-normal">({section.pkUnit})</span>}
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Containers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.rows.map((row) => (
              <TableRow key={row.schoolName}>
                <TableCell>{row.schoolName}</TableCell>
                <TableCell className="text-right">
                  {row.totalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold text-sm">
                  {formatPacks(row.packs)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{section.grandTotal.toFixed(2)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ItemReport({ sections }: { sections: ItemReportSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No production data for this date.
      </p>
    );
  }

  const hot = sections.filter((s) => s.tempType === "hot");
  const cold = sections.filter((s) => s.tempType === "cold");

  return (
    <div className="space-y-8 print:space-y-6">
      {[
        { label: "Hot Items", group: hot, variant: "destructive" as const },
        { label: "Cold Items", group: cold, variant: "secondary" as const },
      ].map(({ label, group, variant }) =>
        group.length > 0 ? (
          <div key={label} className="space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              {label}
              <Badge variant={variant}>{group.length}</Badge>
            </h2>
            {group.map((section) => (
              <FoodSection key={section.foodId} section={section} />
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
