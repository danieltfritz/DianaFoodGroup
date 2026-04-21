import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { parseLocalDate } from "@/lib/cycle";
import { getDeliveryTickets, type DeliveryTicket } from "@/lib/reports";
import { PrintButton } from "./print-button";

function sectionLabel(mealName: string, tempType: string): string {
  const lower = mealName.toLowerCase();
  if (lower.includes("lunch")) return tempType === "hot" ? "Lunch Items - Hot" : "Lunch Items - Cold";
  if (lower.includes("snack") || lower.includes("pm")) return "Afternoon Snack";
  if (lower.includes("breakfast") || lower.includes("am")) return "Next Day Breakfast";
  return `${mealName}${tempType === "hot" ? " - Hot" : tempType === "cold" ? " - Cold" : ""}`;
}

function sectionOrder(mealName: string, tempType: string): number {
  const lower = mealName.toLowerCase();
  if (lower.includes("lunch")) return tempType === "hot" ? 0 : 1;
  if (lower.includes("snack") || lower.includes("pm")) return 2;
  if (lower.includes("breakfast") || lower.includes("am")) return 3;
  return 99;
}

function TicketCard({ ticket, dateStr }: { ticket: DeliveryTicket; dateStr: string }) {
  const { ageGroups, mealCounts, items, milkItems } = ticket;

  // Group items into sections
  const sectionMap = new Map<string, { label: string; order: number; items: typeof items }>();
  for (const item of items) {
    const label = sectionLabel(item.mealName, item.tempType);
    const order = sectionOrder(item.mealName, item.tempType);
    if (!sectionMap.has(label)) sectionMap.set(label, { label, order, items: [] });
    sectionMap.get(label)!.items.push(item);
  }
  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);

  const cityLine = [ticket.city, ticket.postalCode].filter(Boolean).join(", ");

  return (
    <div className="rounded-md border mb-8 text-sm print:border-none print:rounded-none print:mb-0">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 print:bg-transparent print:border-b-2 print:border-gray-800 grid grid-cols-2 gap-x-8 gap-y-0.5">
        <div>
          <p className="font-bold text-base">{ticket.schoolName}</p>
          {ticket.address && <p className="text-muted-foreground print:text-gray-600 text-xs">{ticket.address}</p>}
          {cityLine && <p className="text-muted-foreground print:text-gray-600 text-xs">{cityLine}</p>}
          {ticket.phone && <p className="text-muted-foreground print:text-gray-600 text-xs">Phone: {ticket.phone}</p>}
        </div>
        <div className="text-xs space-y-0.5">
          <p><span className="font-medium">Date:</span> {dateStr}</p>
          {ticket.routeName && <p><span className="font-medium">Route:</span> {ticket.routeName}{ticket.driverName ? ` — ${ticket.driverName}` : ""}</p>}
          {ticket.billingGroupName && <p><span className="font-medium">Group:</span> {ticket.billingGroupName}</p>}
          {ticket.menuName && <p><span className="font-medium">Menu:</span> {ticket.menuName}</p>}
        </div>
      </div>

      {/* Kid count summary */}
      <div className="px-4 py-2 border-b overflow-x-auto">
        <table className="text-xs w-auto">
          <thead>
            <tr>
              <th className="text-left pr-4 font-medium py-1">Meal</th>
              {ageGroups.map((ag) => (
                <th key={ag.id} className="text-right px-2 font-medium py-1 whitespace-nowrap">{ag.name}</th>
              ))}
              <th className="text-right px-2 font-bold py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {mealCounts.map((mc) => (
              <tr key={mc.mealId}>
                <td className="pr-4 py-0.5 text-muted-foreground print:text-gray-600">{mc.mealName}</td>
                {ageGroups.map((ag) => (
                  <td key={ag.id} className="text-right px-2 py-0.5">{mc.counts[ag.id] || ""}</td>
                ))}
                <td className="text-right px-2 py-0.5 font-semibold">{mc.total || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Item sections */}
      {sections.map((section) => (
        <div key={section.label}>
          <div className="px-4 py-1.5 bg-muted/20 print:bg-gray-100 border-b text-xs font-semibold text-muted-foreground print:text-gray-700">
            {section.label}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground print:text-gray-600">
                <th className="text-right px-3 py-1.5 font-medium w-10">Qty</th>
                <th className="text-left px-3 py-1.5 font-medium">Container</th>
                <th className="text-left px-3 py-1.5 font-medium">Description</th>
                {ageGroups.map((ag) => (
                  <th key={ag.id} className="text-right px-2 py-1.5 font-medium whitespace-nowrap">{ag.name}</th>
                ))}
                <th className="text-center px-2 py-1.5 font-medium">Packing</th>
                <th className="text-center px-2 py-1.5 font-medium">Receiving</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item) =>
                item.packs.length > 0
                  ? item.packs.map((pack, pi) => (
                      <tr key={`${item.foodId}-${pi}`} className="border-b last:border-b-0">
                        <td className="text-right px-3 py-1 font-medium">{pack.qty}</td>
                        <td className="px-3 py-1 text-muted-foreground print:text-gray-600">{pack.containerName}</td>
                        <td className="px-3 py-1">{item.foodName}</td>
                        {ageGroups.map((ag) => (
                          <td key={ag.id} className="text-right px-2 py-1 tabular-nums">
                            {pi === 0 ? (item.servingSizes.find((s) => s.ageGroupId === ag.id)?.display ?? "") : ""}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 text-muted-foreground print:text-gray-400">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground print:text-gray-400">—</td>
                      </tr>
                    ))
                  : (
                      <tr key={item.foodId} className="border-b last:border-b-0">
                        <td className="text-right px-3 py-1 text-muted-foreground print:text-gray-400">—</td>
                        <td className="px-3 py-1 text-muted-foreground print:text-gray-400">—</td>
                        <td className="px-3 py-1">{item.foodName}</td>
                        {ageGroups.map((ag) => (
                          <td key={ag.id} className="text-right px-2 py-1 tabular-nums">
                            {item.servingSizes.find((s) => s.ageGroupId === ag.id)?.display ?? ""}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 text-muted-foreground print:text-gray-400">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground print:text-gray-400">—</td>
                      </tr>
                    )
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Milk */}
      {milkItems.length > 0 && (
        <div>
          <div className="px-4 py-1.5 bg-muted/20 print:bg-gray-100 border-b text-xs font-semibold text-muted-foreground print:text-gray-700">
            Milk
          </div>
          <table className="w-full text-xs">
            <tbody>
              {milkItems.map((m) => (
                <tr key={m.milkTypeName} className="border-b last:border-b-0">
                  <td className="text-right px-3 py-1 font-medium w-10">{m.qty}</td>
                  <td className="px-3 py-1 text-muted-foreground print:text-gray-600" colSpan={ageGroups.length + 3}>{m.milkTypeName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function DeliveryTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = parseLocalDate(dateStr);

  const tickets = await getDeliveryTickets(date);

  const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/reports?date=${dateStr}`} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Delivery Tickets — {displayDate}</h1>
        <PrintButton />
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No delivery data for this date.</p>
      ) : (
        tickets.map((ticket, i) => (
          <div key={ticket.schoolId} className={i > 0 ? "print:break-before-page" : ""}>
            <TicketCard ticket={ticket} dateStr={displayDate} />
          </div>
        ))
      )}
    </div>
  );
}
