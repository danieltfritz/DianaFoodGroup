import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PrintButton } from "./print-button";

type ContainerRow = { containerName: string; containerSize: number };

function calcPacking(totalQty: number, containers: ContainerRow[]) {
  if (containers.length === 0) return null;
  const sorted = [...containers].sort((a, b) => b.containerSize - a.containerSize);
  const parts: string[] = [];
  let remaining = totalQty;
  for (const c of sorted) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / c.containerSize);
    if (count > 0) {
      parts.push(`${count} ${c.containerName}`);
      remaining -= count * c.containerSize;
    }
  }
  if (remaining > 0) parts.push(`${remaining} loose`);
  return parts.join(" + ");
}

export default async function PackingListPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId: runIdStr } = await params;
  const runId = Number(runIdStr);
  if (isNaN(runId)) notFound();

  const run = await prisma.paperProductionRun.findUnique({
    where: { id: runId },
    include: {
      group: true,
      amounts: {
        include: {
          school: true,
          paper: { include: { containers: true } },
          paperSize: true,
        },
        orderBy: [{ school: { name: "asc" } }, { paper: { name: "asc" } }, { paperSizeId: "asc" }],
      },
    },
  });
  if (!run) notFound();

  const schoolIds = [...new Set(run.amounts.map((a) => a.schoolId))];
  const comments = await prisma.schoolPaperComment.findMany({
    where: { schoolId: { in: schoolIds } },
  });
  const commentMap = new Map(comments.map((c) => [c.schoolId, c.comment]));

  const bySchool = new Map<number, { schoolId: number; schoolName: string; items: typeof run.amounts }>();
  for (const a of run.amounts) {
    const existing = bySchool.get(a.schoolId) ?? { schoolId: a.schoolId, schoolName: a.school.name, items: [] };
    existing.items.push(a);
    bySchool.set(a.schoolId, existing);
  }

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const grandTotal = run.amounts.reduce((s, a) => s + a.totalQty, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/paper-goods/runs/${runId}`} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Packing List</h1>
        <PrintButton />
      </div>

      <div className="hidden print:block mb-6 pb-4 border-b">
        <p className="text-xl font-bold">Packing List — {run.group?.name ?? "All Schools"}</p>
        <p className="text-sm text-gray-600">
          {fmtDate(run.startDate)} – {fmtDate(run.endDate)} · {grandTotal.toLocaleString()} total items
        </p>
      </div>

      {Array.from(bySchool.values()).map((school, i) => {
        const comment = commentMap.get(school.schoolId);
        return (
          <div
            key={school.schoolId}
            className={[
              "rounded-md border mb-8",
              i > 0 ? "print:break-before-page print:border-none print:rounded-none" : "print:border-none print:rounded-none",
            ].join(" ")}
          >
            <div className="px-4 py-3 border-b bg-muted/30 print:bg-transparent print:border-b-2 print:border-gray-800">
              <span className="font-semibold text-base">{school.schoolName}</span>
              {comment && <p className="text-sm text-muted-foreground mt-0.5 print:text-gray-600">{comment}</p>}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground print:text-gray-600">
                  <th className="text-left px-4 py-2 font-medium">Paper Item</th>
                  <th className="text-left px-4 py-2 font-medium">Size</th>
                  <th className="text-right px-4 py-2 font-medium">Qty</th>
                  <th className="text-left px-4 py-2 font-medium">Packing</th>
                </tr>
              </thead>
              <tbody>
                {school.items.map((item) => {
                  const containers = item.paper.containers.filter(
                    (c) => c.paperSizeId === item.paperSizeId
                  );
                  const packing = calcPacking(item.totalQty, containers);
                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{item.paper.name}</td>
                      <td className="px-4 py-2 text-muted-foreground print:text-gray-600">
                        {item.paperSize?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {item.totalQty.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground print:text-gray-600">
                        {packing ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
