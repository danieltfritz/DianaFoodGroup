import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateNav } from "@/components/kid-counts/date-nav";
import { parseLocalDate } from "@/lib/cycle";
import { Button } from "@/components/ui/button";
import { FoodAuditReport } from "@/components/reports/food-audit-report";
import { SchoolSummaryReport } from "@/components/reports/school-summary-report";
import { ContainerCountReport } from "@/components/reports/container-count-report";
import { MilkReport } from "@/components/reports/milk-report";
import { MilkCountReport } from "@/components/reports/milk-count-report";
import { DailyKidCountReport } from "@/components/reports/daily-kid-count-report";
import { ItemReport } from "@/components/reports/item-report";
import { ProductionSummaryReport } from "@/components/reports/production-summary-report";
import {
  getSchoolSummary,
  getMilkCountReport,
  getDailyKidCountReport,
} from "@/lib/reports";
import {
  getSnapshotFoodAudit,
  getSnapshotContainerReport,
  getSnapshotMilkReport,
  getSnapshotItemReport,
  getSnapshotProductionSummary,
} from "@/lib/production-reports";
import { prisma } from "@/lib/db";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { date: dateParam, tab } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = parseLocalDate(dateStr);

  // Look up production snapshot by production date — use UTC midnight to avoid
  // local-timezone drift turning "2026-04-23" into a different UTC date.
  const production = await prisma.production.findFirst({
    where: { productionDate: new Date(dateStr + "T00:00:00.000Z") },
    select: { id: true, productionDate: true, servingDateLSD: true },
  });

  // Live reports (kid/milk counts) must filter by serving/delivery date, not production date.
  const liveDate = production ? production.servingDateLSD : date;

  const [schoolSummary, milkCountReport, kidCountReport] = await Promise.all([
    getSchoolSummary(liveDate),
    getMilkCountReport(liveDate),
    getDailyKidCountReport(liveDate),
  ]);

  const [foodAudit, containerReport, milkReport, itemReport, productionSummary] =
    production
      ? await Promise.all([
          getSnapshotFoodAudit(production.id),
          getSnapshotContainerReport(production.id),
          getSnapshotMilkReport(production.id),
          getSnapshotItemReport(production.id),
          getSnapshotProductionSummary(production.id),
        ])
      : [[], [], [], [], []];

  const activeTab = tab ?? "summary";

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

  const noSnapshotBanner = !production && (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      No production run found for {fmtDate(date)}.{" "}
      <Link href="/production" className="font-medium underline">
        Go to Production
      </Link>{" "}
      to calculate it first.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          {production && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Snapshot from production run on{" "}
              {fmtDate(production.productionDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/reports/fruit" />}>
            Fruit Report
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/walkthrough?date=${dateStr}`} />}>
            Walk-Through
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/export?date=${dateStr}`} />}>
            Export Items
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/milk-export?date=${dateStr}`} />}>
            Export Milk
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/kid-count-export?date=${dateStr}`} />}>
            Export Kid Counts
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/delivery-tickets?date=${dateStr}`} />}>
            Delivery Tickets
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/delivery-tickets-export?date=${dateStr}`} />}>
            Export Tickets
          </Button>
          <DateNav date={dateStr} basePath="/reports" />
        </div>
      </div>

      {noSnapshotBanner}

      <Tabs defaultValue={activeTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="summary">School Summary</TabsTrigger>
          <TabsTrigger value="food-audit">Food Audit</TabsTrigger>
          <TabsTrigger value="containers">Container Count</TabsTrigger>
          <TabsTrigger value="milk">Milk Report</TabsTrigger>
          <TabsTrigger value="milk-count">Milk Count</TabsTrigger>
          <TabsTrigger value="kid-counts">Kid Counts</TabsTrigger>
          <TabsTrigger value="item-report">Item Report</TabsTrigger>
          <TabsTrigger value="prod-summary">Prod Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SchoolSummaryReport rows={schoolSummary} />
        </TabsContent>

        <TabsContent value="food-audit" className="mt-4">
          <FoodAuditReport items={foodAudit} />
        </TabsContent>

        <TabsContent value="containers" className="mt-4">
          <ContainerCountReport rows={containerReport} />
        </TabsContent>

        <TabsContent value="milk" className="mt-4">
          <MilkReport rows={milkReport} />
        </TabsContent>

        <TabsContent value="milk-count" className="mt-4">
          <MilkCountReport data={milkCountReport} />
        </TabsContent>

        <TabsContent value="kid-counts" className="mt-4">
          <DailyKidCountReport data={kidCountReport} />
        </TabsContent>

        <TabsContent value="item-report" className="mt-4">
          <ItemReport sections={itemReport} />
        </TabsContent>

        <TabsContent value="prod-summary" className="mt-4">
          <ProductionSummaryReport sections={productionSummary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
