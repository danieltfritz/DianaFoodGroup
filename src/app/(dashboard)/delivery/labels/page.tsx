import { getDeliveryData } from "@/lib/delivery";
import { PrintButton } from "@/components/delivery/print-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function LabelsPage({ searchParams }: { searchParams: { date?: string; route?: string } }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = searchParams.date ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);
  const routeFilter = searchParams.route ? Number(searchParams.route) : null;

  const allSchools = await getDeliveryData(date);
  const schools = allSchools.filter((s) => {
    if (s.isClosed || s.lines.length === 0) return false;
    if (routeFilter && s.routeId !== routeFilter) return false;
    return true;
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateShort = date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

  // Build label list: one label per school × meal × food item
  const labels = schools.flatMap((school) =>
    school.lines.map((line) => ({
      school: school.schoolName,
      route: school.route ?? "",
      date: dateShort,
      weekday: dayName,
      meal: line.mealName,
      foodItem: line.foodName,
      amount: `${line.totalAmount.toFixed(2)}${line.pkUnit ? ` ${line.pkUnit}` : ""}`,
      packs: line.packsNeeded,
    }))
  );

  return (
    <div>
      {/* Screen controls */}
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <Button variant="ghost" size="icon" render={<Link href={`/delivery?date=${dateStr}`} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Food Labels — {dayName}, {dateShort}</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{labels.length} labels</span>
          <PrintButton />
        </div>
      </div>

      {labels.length === 0 ? (
        <p className="text-muted-foreground text-center py-12 print:hidden">
          No labels to print for this date.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 print:gap-0 print:grid-cols-3">
          {labels.map((label, i) => (
            <div
              key={i}
              className="border rounded p-3 text-xs space-y-0.5 print:border print:rounded-none print:p-2 print:break-inside-avoid"
            >
              <div className="font-bold text-sm leading-tight">{label.school}</div>
              <div className="text-muted-foreground">Route: {label.route || "—"}</div>
              <div className="text-muted-foreground">{label.weekday} · {label.date}</div>
              <div className="border-t my-1" />
              <div className="font-semibold">{label.meal}</div>
              <div className="font-bold text-base">{label.foodItem}</div>
              <div className="border-t my-1" />
              <div className="flex justify-between">
                <span>Amount: <strong>{label.amount}</strong></span>
                {label.packs !== null && (
                  <span>Packs: <strong>{label.packs}</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
