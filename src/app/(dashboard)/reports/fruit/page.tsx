import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getFruitReport } from "@/lib/reports";
import { FruitReport } from "@/components/reports/fruit-report";
import { PrintButton } from "@/components/delivery/print-button";

export default async function FruitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { start, end } = await searchParams;

  // Default to current week Mon–Fri
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const startStr = start ?? monday.toISOString().split("T")[0];
  const endStr = end ?? friday.toISOString().split("T")[0];

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  const rows = await getFruitReport(startDate, endDate);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" render={<Link href="/reports" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Fruit Report</h1>
        <span className="text-sm text-muted-foreground">
          {fmtDate(startDate)} — {fmtDate(endDate)}
        </span>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      {/* Date range form */}
      <form method="GET" className="flex items-end gap-3 print:hidden">
        <div className="space-y-1">
          <label className="text-xs font-medium">Start Date</label>
          <input
            type="date"
            name="start"
            defaultValue={startStr}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">End Date</label>
          <input
            type="date"
            name="end"
            defaultValue={endStr}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <Button type="submit" size="sm">Apply</Button>
      </form>

      <FruitReport rows={rows} />
    </div>
  );
}
