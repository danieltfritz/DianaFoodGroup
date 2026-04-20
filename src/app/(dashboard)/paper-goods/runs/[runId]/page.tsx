import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PaperRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId: runIdStr } = await params;
  const runId = Number(runIdStr);
  if (isNaN(runId)) notFound();

  const run = await prisma.paperProductionRun.findUnique({
    where: { id: runId },
    include: {
      group: true,
      amounts: {
        include: { school: true, paper: true, paperSize: true },
        orderBy: [{ school: { name: "asc" } }, { paper: { name: "asc" } }, { paperSizeId: "asc" }],
      },
    },
  });
  if (!run) notFound();

  const bySchool = new Map<number, { schoolName: string; items: typeof run.amounts }>();
  for (const a of run.amounts) {
    const existing = bySchool.get(a.schoolId) ?? { schoolName: a.school.name, items: [] };
    existing.items.push(a);
    bySchool.set(a.schoolId, existing);
  }

  const grandTotal = run.amounts.reduce((s, a) => s + a.totalQty, 0);

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/paper-goods" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Paper Run — {fmtDate(run.startDate)} to {fmtDate(run.endDate)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {run.group?.name ?? "No group"} · Created {new Date(run.createdAt).toLocaleDateString()} · {grandTotal.toLocaleString()} total items
          </p>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/paper-goods/runs/${run.id}/pack`} />}>
          <ClipboardList className="size-4 mr-2" />
          Packing List
        </Button>
      </div>

      {Array.from(bySchool.values()).map((school) => (
        <div key={school.schoolName} className="rounded-md border">
          <div className="px-4 py-2 border-b bg-muted/30">
            <span className="font-medium">{school.schoolName}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paper Item</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {school.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.paper.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.paperSize?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{item.totalQty.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
