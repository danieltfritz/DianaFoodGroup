import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateNav } from "@/components/kid-counts/date-nav";
import { parseLocalDate } from "@/lib/cycle";
import { Button } from "@/components/ui/button";
import { FoodAuditReport } from "@/components/reports/food-audit-report";
import { SchoolSummaryReport } from "@/components/reports/school-summary-report";
import { ContainerCountReport } from "@/components/reports/container-count-report";
import { MilkReport } from "@/components/reports/milk-report";
import { ItemReport } from "@/components/reports/item-report";
import { ProductionSummaryReport } from "@/components/reports/production-summary-report";
import { calculateProduction } from "@/lib/production";
import { getSchoolSummary, getContainerReport, getMilkReport, getItemReport, getProductionSummary } from "@/lib/reports";

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

  const [productionResult, schoolSummary, containerReport, milkReport, itemReport, productionSummary] = await Promise.all([
    calculateProduction(date),
    getSchoolSummary(date),
    getContainerReport(date),
    getMilkReport(date),
    getItemReport(date),
    getProductionSummary(date),
  ]);
  const productionItems = productionResult.all;

  const activeTab = tab ?? "summary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/reports/fruit" />}>
            Fruit Report
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/walkthrough?date=${dateStr}`} />}>
            Walk-Through
          </Button>
          <DateNav date={dateStr} />
        </div>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="summary">School Summary</TabsTrigger>
          <TabsTrigger value="food-audit">Food Audit</TabsTrigger>
          <TabsTrigger value="containers">Container Count</TabsTrigger>
          <TabsTrigger value="milk">Milk Report</TabsTrigger>
          <TabsTrigger value="item-report">Item Report</TabsTrigger>
          <TabsTrigger value="prod-summary">Prod Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SchoolSummaryReport rows={schoolSummary} />
        </TabsContent>

        <TabsContent value="food-audit" className="mt-4">
          <FoodAuditReport items={productionItems} />
        </TabsContent>

        <TabsContent value="containers" className="mt-4">
          <ContainerCountReport rows={containerReport} />
        </TabsContent>

        <TabsContent value="milk" className="mt-4">
          <MilkReport rows={milkReport} />
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
