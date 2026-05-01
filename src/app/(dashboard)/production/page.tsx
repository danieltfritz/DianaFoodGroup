import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunProductionForm } from "@/components/production/run-production-form";
import { ChevronRight } from "lucide-react";

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });

export default async function ProductionPage() {
  const runs = await prisma.production.findMany({
    orderBy: { productionDate: "desc" },
    include: {
      _count: { select: { menus: true, milks: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calculate and review production snapshots by date.
          </p>
        </div>
        <RunProductionForm />
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-md">
          No production runs yet. Pick a date and click Calculate Production.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Production Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>LSD Serving</TableHead>
                <TableHead>Breakfast Serving</TableHead>
                <TableHead className="text-right">Menus</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/production/${run.id}`} className="block font-medium">
                      {fmtDate(run.productionDate)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/production/${run.id}`} className="block">
                      {fmtDate(run.deliveryDate)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/production/${run.id}`} className="block">
                      {fmtDate(run.servingDateLSD)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/production/${run.id}`} className="block">
                      {fmtDate(run.servingDateB)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/production/${run.id}`} className="block">
                      <Badge variant="secondary">{run._count.menus}</Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/production/${run.id}`}>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
