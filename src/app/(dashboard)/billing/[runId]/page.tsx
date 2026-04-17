import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BillingRunPage({ params }: { params: { runId: string } }) {
  const runId = Number(params.runId);
  if (isNaN(runId)) notFound();

  const run = await prisma.billingRun.findUnique({
    where: { id: runId },
    include: { details: true },
  });
  if (!run) notFound();

  const [schools, meals, ageGroups] = await Promise.all([
    prisma.school.findMany({ select: { id: true, name: true } }),
    prisma.meal.findMany({ select: { id: true, name: true } }),
    prisma.ageGroup.findMany({ select: { id: true, name: true } }),
  ]);

  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));
  const mealMap = Object.fromEntries(meals.map((m) => [m.id, m.name]));
  const ageMap = Object.fromEntries(ageGroups.map((a) => [a.id, a.name]));

  // Group by school
  const bySchool = new Map<number, { kids: number; total: number; name: string }>();
  for (const d of run.details) {
    const ex = bySchool.get(d.schoolId) ?? { kids: 0, total: 0, name: schoolMap[d.schoolId] ?? "Unknown" };
    bySchool.set(d.schoolId, {
      name: ex.name,
      kids: ex.kids + d.kidCount,
      total: ex.total + d.kidCount * Number(d.priceUsed),
    });
  }

  const grandTotal = run.details.reduce((s, d) => s + d.kidCount * Number(d.priceUsed), 0);
  const grandKids = run.details.reduce((s, d) => s + d.kidCount, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/billing" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Billing Run — {new Date(run.deliveryDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </h1>
          <p className="text-sm text-muted-foreground">Created {new Date(run.createdAt).toLocaleDateString()}</p>
        </div>
        <Button variant="outline" render={<a href={`/api/billing/${runId}/export`} download />}>
          <Download className="mr-2 size-4" />Export CSV
        </Button>
      </div>

      {/* School summary */}
      <div className="space-y-2">
        <h2 className="font-semibold">School Summary</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Total Kids</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(bySchool.values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.kids}</TableCell>
                    <TableCell className="text-right">${s.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              <TableRow className="font-bold bg-muted/30">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{grandKids}</TableCell>
                <TableCell className="text-right">${grandTotal.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail lines */}
      <div className="space-y-2">
        <h2 className="font-semibold">Detail Lines</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead className="text-right">Kids</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.details
                .sort((a, b) => (schoolMap[a.schoolId] ?? "").localeCompare(schoolMap[b.schoolId] ?? ""))
                .map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{schoolMap[d.schoolId] ?? d.schoolId}</TableCell>
                    <TableCell>{mealMap[d.mealId] ?? d.mealId}</TableCell>
                    <TableCell>{ageMap[d.ageGroupId] ?? d.ageGroupId}</TableCell>
                    <TableCell className="text-right">{d.kidCount}</TableCell>
                    <TableCell className="text-right">${Number(d.priceUsed).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(d.kidCount * Number(d.priceUsed)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
