import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDeliveryData } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PrintButton } from "@/components/delivery/print-button";

export default async function DeliveryTicketPage({
  params,
  searchParams,
}: {
  params: { schoolId: string };
  searchParams: { date?: string };
}) {
  const schoolId = Number(params.schoolId);
  if (isNaN(schoolId)) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = searchParams.date ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);

  const [allDelivery, school] = await Promise.all([
    getDeliveryData(date),
    prisma.school.findUnique({ where: { id: schoolId }, include: { route: true } }),
  ]);

  if (!school) notFound();
  const data = allDelivery.find((s) => s.schoolId === schoolId);

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Group lines by meal
  const byMeal = data
    ? data.lines.reduce<Record<string, typeof data.lines>>((acc, line) => {
        (acc[line.mealName] ??= []).push(line);
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-4">
      {/* Screen-only controls */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" render={<Link href={`/delivery?date=${dateStr}`} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Delivery Ticket</h1>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      {/* Printable ticket */}
      <div className="border rounded-lg p-6 print:border-0 print:p-0 max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{school.name}</h2>
            {school.address && <p className="text-sm text-muted-foreground">{school.address}</p>}
            {(school.city || school.state) && (
              <p className="text-sm text-muted-foreground">
                {[school.city, school.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold">{dayName}</p>
            <p className="text-sm text-muted-foreground">{dateFormatted}</p>
            {school.route && <p className="text-sm mt-1">Route: <strong>{school.route.name}</strong></p>}
          </div>
        </div>

        {!data || data.lines.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No food items for this date.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byMeal).map(([mealName, lines]) => (
              <div key={mealName}>
                <h3 className="font-semibold text-lg border-b pb-1 mb-3">{mealName}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Food Item</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right">Packs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={`${line.foodId}-${line.mealId}`} className="border-t">
                        <td className="py-1.5">{line.foodName}</td>
                        <td className="py-1.5 text-right">
                          {line.totalAmount.toFixed(2)} {line.pkUnit ?? ""}
                        </td>
                        <td className="py-1.5 text-right font-semibold">
                          {line.packsNeeded ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="border-t pt-4 flex justify-between text-sm font-semibold">
              <span>Total Kids: {data.totalKids}</span>
              <span>Total Food Lines: {data.lines.length}</span>
            </div>
          </div>
        )}

        {/* Signature line */}
        <div className="mt-10 pt-4 border-t grid grid-cols-2 gap-8 text-sm text-muted-foreground">
          <div>Received by: ___________________________</div>
          <div>Date/Time: ___________________________</div>
        </div>
      </div>
    </div>
  );
}
