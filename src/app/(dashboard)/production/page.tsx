import { calculateProduction } from "@/lib/production";
import { DateNav } from "@/components/kid-counts/date-nav";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = searchParams.date ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);

  const items = await calculateProduction(date);

  const hot = items.filter((i) => i.tempType === "hot");
  const cold = items.filter((i) => i.tempType === "cold");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Production Report</h1>
        <DateNav date={dateStr} />
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No production data for this date. Enter kid counts first.
        </p>
      ) : (
        <>
          {[{ label: "Hot Items", items: hot }, { label: "Cold Items", items: cold }].map(
            ({ label, items: group }) =>
              group.length > 0 && (
                <div key={label} className="space-y-2">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    {label}
                    <Badge variant={label.startsWith("Hot") ? "destructive" : "secondary"}>
                      {group.length}
                    </Badge>
                  </h2>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Food Item</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Pk Size</TableHead>
                          <TableHead className="text-right">Packs Needed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map((item) => {
                          const packs = item.pkSize
                            ? Math.ceil(item.totalAmount / item.pkSize)
                            : null;
                          return (
                            <TableRow key={item.foodId}>
                              <TableCell className="font-medium">{item.foodName}</TableCell>
                              <TableCell className="text-right">
                                {item.totalAmount.toFixed(2)} {item.pkUnit ?? ""}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.pkSize ? `${item.pkSize} ${item.pkUnit ?? ""}` : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {packs ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}
