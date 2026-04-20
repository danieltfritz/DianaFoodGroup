import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PaperReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; startDate?: string; endDate?: string }>;
}) {
  const { groupId: groupIdParam, startDate: startParam, endDate: endParam } = await searchParams;

  const groups = await prisma.paperGroup.findMany({ orderBy: { name: "asc" } });

  const today = new Date();
  const defaultEnd = today.toISOString().split("T")[0];
  const d90 = new Date(today);
  d90.setDate(today.getDate() - 90);
  const defaultStart = d90.toISOString().split("T")[0];

  const startStr = startParam ?? defaultStart;
  const endStr = endParam ?? defaultEnd;
  const selectedGroupId = groupIdParam ? Number(groupIdParam) : null;

  const startDate = new Date(startStr + "T00:00:00");
  const endDate = new Date(endStr + "T23:59:59");

  const runs = await prisma.paperProductionRun.findMany({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(selectedGroupId ? { paperGroupId: selectedGroupId } : {}),
    },
    include: {
      group: true,
      amounts: true,
    },
    orderBy: { startDate: "desc" },
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Aggregate totals by paper item + size across all matching runs
  type ItemKey = string;
  const itemTotals = new Map<ItemKey, { paperId: number; paperSizeId: number | null; totalQty: number }>();

  for (const run of runs) {
    for (const a of run.amounts) {
      const k: ItemKey = `${a.paperId}-${a.paperSizeId ?? 0}`;
      const existing = itemTotals.get(k);
      if (existing) {
        existing.totalQty += a.totalQty;
      } else {
        itemTotals.set(k, { paperId: a.paperId, paperSizeId: a.paperSizeId, totalQty: a.totalQty });
      }
    }
  }

  // Load paper names for the aggregation table
  const paperIds = [...new Set([...itemTotals.values()].map((i) => i.paperId))];
  const sizeIds = [...new Set([...itemTotals.values()].map((i) => i.paperSizeId).filter((id): id is number => id !== null))];

  const [papers, sizes] = await Promise.all([
    paperIds.length > 0 ? prisma.paperItem.findMany({ where: { id: { in: paperIds } } }) : [],
    sizeIds.length > 0 ? prisma.paperSize.findMany({ where: { id: { in: sizeIds } } }) : [],
  ]);

  const paperMap = new Map(papers.map((p) => [p.id, p.name]));
  const sizeMap = new Map(sizes.map((s) => [s.id, s.name]));

  const aggregated = [...itemTotals.values()]
    .sort((a, b) => {
      const na = paperMap.get(a.paperId) ?? "";
      const nb = paperMap.get(b.paperId) ?? "";
      return na.localeCompare(nb) || (a.paperSizeId ?? 0) - (b.paperSizeId ?? 0);
    });

  const grandTotal = aggregated.reduce((s, i) => s + i.totalQty, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/paper-goods" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Paper Goods Reports</h1>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="groupId">Group</label>
          <select
            id="groupId"
            name="groupId"
            defaultValue={selectedGroupId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            defaultValue={startStr}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            defaultValue={endStr}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <Button type="submit">Filter</Button>
      </form>

      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs found in this date range.</p>
      ) : (
        <>
          {/* Run History */}
          <div>
            <h2 className="font-semibold mb-2">
              Run History — {runs.length} run{runs.length !== 1 ? "s" : ""}
            </h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Schools</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const schoolCount = new Set(run.amounts.map((a) => a.schoolId)).size;
                    const total = run.amounts.reduce((s, a) => s + a.totalQty, 0);
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">
                          {fmtDate(run.startDate)} – {fmtDate(run.endDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {run.group?.name ?? "—"}
                        </TableCell>
                        <TableCell>{schoolCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{total.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Link
                              href={`/paper-goods/runs/${run.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Detail
                            </Link>
                            <span className="text-muted-foreground">·</span>
                            <Link
                              href={`/paper-goods/runs/${run.id}/pack`}
                              className="text-xs text-primary hover:underline"
                            >
                              Pack
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Aggregated totals */}
          {aggregated.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">
                Totals by Item — {grandTotal.toLocaleString()} items across {runs.length} run{runs.length !== 1 ? "s" : ""}
              </h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paper Item</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregated.map((item) => (
                      <TableRow key={`${item.paperId}-${item.paperSizeId ?? 0}`}>
                        <TableCell>{paperMap.get(item.paperId) ?? `Paper #${item.paperId}`}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.paperSizeId ? (sizeMap.get(item.paperSizeId) ?? "—") : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {item.totalQty.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
