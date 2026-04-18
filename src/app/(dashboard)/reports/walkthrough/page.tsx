import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PrintButton } from "@/components/delivery/print-button";
import { getDeliveryData } from "@/lib/delivery";
import type { DeliverySchool } from "@/lib/delivery";

function SchoolBlock({ school }: { school: DeliverySchool }) {
  const lsdLines = school.isBox ? [] : school.lines.filter((l) => l.batch === "LSD");
  const tombLines = school.isBox ? [] : school.lines.filter((l) => l.batch === "TomB");
  const boxLines = school.isBox ? school.lines : [];

  return (
    <div className="break-inside-avoid border rounded p-3 print:rounded-none print:border-x-0 print:border-t-0 print:border-b print:p-2">
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-bold text-sm">{school.schoolName}</span>
        <span className="text-xs text-muted-foreground">{school.totalKids} kids</span>
      </div>

      {school.isClosed ? (
        <p className="text-xs text-muted-foreground italic">CLOSED</p>
      ) : school.lines.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items</p>
      ) : (
        <div className="space-y-2">
          {school.isBox ? (
            <FoodLines label="Box Menu" lines={boxLines} />
          ) : (
            <>
              {lsdLines.length > 0 && <FoodLines label="LSD" lines={lsdLines} />}
              {tombLines.length > 0 && <FoodLines label="TomB" lines={tombLines} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FoodLines({
  label,
  lines,
}: {
  label: string;
  lines: DeliverySchool["lines"];
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <table className="w-full text-xs">
        <tbody>
          {lines.map((line) => (
            <tr key={`${line.foodId}-${line.mealId}`} className="border-t first:border-t-0">
              <td className="py-0.5 pr-2">{line.foodName}</td>
              <td className="py-0.5 text-right pr-2 whitespace-nowrap">
                {line.totalAmount.toFixed(2)} {line.pkUnit ?? ""}
              </td>
              <td className="py-0.5 text-right font-semibold whitespace-nowrap">
                {line.packsLabel !== "—" ? line.packsLabel : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function WalkthroughPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);

  const allSchools = await getDeliveryData(date);
  const active = allSchools.filter((s) => s.lines.length > 0 || s.isClosed);

  // Group by route
  const byRoute = new Map<string, DeliverySchool[]>();
  for (const s of active) {
    const key = s.route ?? "No Route";
    (byRoute.get(key) ?? byRoute.set(key, []).get(key)!).push(s);
  }

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Screen controls */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" render={<Link href="/reports" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Walk-Through</h1>
        <form method="GET" className="flex items-center gap-2 ml-2">
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="border rounded px-2 py-1 text-sm"
          />
          <Button type="submit" size="sm">Go</Button>
        </form>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Kitchen Walk-Through</h1>
        <p className="text-sm text-muted-foreground">{dayName}, {dateFormatted}</p>
      </div>

      {active.length === 0 ? (
        <p className="text-muted-foreground text-center py-12 print:hidden">
          No delivery data for this date.
        </p>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {Array.from(byRoute.entries()).map(([routeName, schools]) => (
            <div key={routeName}>
              <h2 className="font-bold text-base border-b pb-1 mb-2 print:text-sm">
                {routeName}
              </h2>
              <div className="grid grid-cols-2 gap-2 print:grid-cols-2 print:gap-1">
                {schools.map((s) => (
                  <SchoolBlock key={s.schoolId} school={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
