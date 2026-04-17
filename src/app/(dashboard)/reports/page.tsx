import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateNav } from "@/components/kid-counts/date-nav";
import { FoodAuditReport } from "@/components/reports/food-audit-report";
import { SchoolSummaryReport } from "@/components/reports/school-summary-report";
import { ContainerCountReport } from "@/components/reports/container-count-report";
import { MilkReport } from "@/components/reports/milk-report";
import { calculateProduction } from "@/lib/production";
import { getSchoolSummary, getContainerReport, getMilkReport } from "@/lib/reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { date: dateParam, tab } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);

  const [productionItems, schoolSummary, containerReport, milkReport] = await Promise.all([
    calculateProduction(date),
    getSchoolSummary(date),
    getContainerReport(date),
    getMilkReport(date),
  ]);

  const activeTab = tab ?? "summary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <DateNav date={dateStr} />
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="summary">School Summary</TabsTrigger>
          <TabsTrigger value="food-audit">Food Audit</TabsTrigger>
          <TabsTrigger value="containers">Container Count</TabsTrigger>
          <TabsTrigger value="milk">Milk Report</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
