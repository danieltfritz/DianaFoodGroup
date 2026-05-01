import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { parseLocalDate } from "@/lib/cycle";
import { prisma } from "@/lib/db";
import { getSnapshotDeliveryTickets } from "@/lib/production-reports";
import type { DeliveryTicket } from "@/lib/reports";
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

  const sectionMap = new Map<string, { label: string; order: number; items: typeof items }>();
  for (const item of items) {
    const label = sectionLabel(item.mealName, item.tempType);
    const order = sectionOrder(item.mealName, item.tempType);
    if (!sectionMap.has(label)) sectionMap.set(label, { label, order, items: [] });
    sectionMap.get(label)!.items.push(item);
  }
  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);

  const cityLine = [ticket.city, ticket.postalCode].filter(Boolean).join(", ");

  // Group milk items by milk type for display
  const milkGroups = Array.from(
    milkItems.reduce((groups, m) => {
      const key = `${m.labelColor}-${m.milkTypeName}`;
      if (!groups.has(key)) groups.set(key, { label: `${m.labelColor} (${m.milkTypeName})`, items: [] as typeof milkItems });
      groups.get(key)!.items.push(m);
      return groups;
    }, new Map<string, { label: string; items: typeof milkItems }>())
    .values()
  );

  return (
    <div className="rounded-md border mb-8 text-sm print:border-none print:rounded-none print:mb-0">
      {/* Header: school info left, driver + kid counts right */}
      <div className="border-b print:border-b-2 print:border-gray-800">
        <div className="grid grid-cols-[1fr_auto] gap-0">
          <div className="px-4 py-3 space-y-0.5">
            {ticket.billingGroupName && (
              <p className="text-xs"><span className="font-medium">Group:</span> {ticket.billingGroupName}</p>
            )}
            {ticket.menuName && (
              <p className="text-xs"><span className="font-medium">Menu:</span> {ticket.menuName}</p>
            )}
            {ticket.routeName && (
              <p className="text-xs"><span className="font-medium">Route:</span> {ticket.routeName}</p>
            )}
            <p className="font-bold text-base mt-1">{ticket.schoolName}</p>
            {ticket.address && <p className="text-xs text-muted-foreground print:text-gray-600">{ticket.address}</p>}
            {cityLine && <p className="text-xs text-muted-foreground print:text-gray-600">{cityLine}</p>}
            {ticket.phone && <p className="text-xs text-muted-foreground print:text-gray-600">Phone: {ticket.phone}</p>}
            <p className="text-xs"><span className="font-medium">Date:</span> {dateStr}</p>
          </div>

          <div className="border-l flex flex-col">
            <div className="border-b px-4 py-1.5 text-xs">
              <div className="text-muted-foreground font-medium">Driver Name</div>
              <div>{ticket.driverName ?? <span className="text-muted-foreground italic">—</span>}</div>
            </div>
            <div className="px-3 py-2 flex-1">
              <table className="text-xs w-auto">
                <thead>
                  <tr>
                    <th className="text-left pr-3 py-0.5 font-medium"></th>
                    {ageGroups.map((ag) => (
                      <th key={ag.id} className="text-right px-2 py-0.5 font-medium whitespace-nowrap">{ag.name}</th>
                    ))}
                    <th className="text-right px-2 py-0.5 font-bold">Totals</th>
                  </tr>
                </thead>
                <tbody>
                  {mealCounts.map((mc) => (
                    <tr key={mc.mealId}>
                      <td className="pr-3 py-0.5 text-muted-foreground print:text-gray-600">{mc.mealName}</td>
                      {ageGroups.map((ag) => (
                        <td key={ag.id} className="text-right px-2 py-0.5">{mc.counts[ag.id] || 0}</td>
                      ))}
                      <td className="text-right px-2 py-0.5 font-semibold">{mc.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Item sections */}
      {sections.map((section) => (
        <div key={section.label}>
          <div className="px-4 py-1 bg-muted/20 print:bg-gray-100 border-b text-xs font-semibold text-muted-foreground print:text-gray-700">
            {section.label}
          </div>
          <table className="w-full text-xs border-b">
            <thead>
              <tr className="border-b text-muted-foreground print:text-gray-600">
                <th className="text-right px-3 py-1 font-medium w-10">Qty</th>
                <th className="text-left px-3 py-1 font-medium w-24">Container</th>
                <th className="text-left px-3 py-1 font-medium">Description</th>
                <th colSpan={ageGroups.length} className="text-center px-2 py-1 font-medium border-l">
                  Portion Sizes
                </th>
                <th className="text-center px-2 py-1 font-medium border-l w-16">Time</th>
                <th className="text-center px-2 py-1 font-medium border-l w-20">Packing</th>
                <th className="text-center px-2 py-1 font-medium border-l w-20">Receiving</th>
              </tr>
              <tr className="border-b text-muted-foreground print:text-gray-600">
                <th /><th /><th />
                {ageGroups.map((ag) => (
                  <th key={ag.id} className="text-right px-2 py-0.5 font-normal border-l first:border-l-0 whitespace-nowrap">{ag.name}</th>
                ))}
                <th className="border-l" /><th className="border-l" /><th className="border-l" />
              </tr>
            </thead>
            <tbody>
              {section.items.map((item) =>
                item.packs.length > 0
                  ? item.packs.map((pack, pi) => (
                      <tr key={`${item.foodId}-${item.mealId}-${pi}`} className="border-b last:border-b-0">
                        <td className="text-right px-3 py-1 font-medium">{pack.qty}</td>
                        <td className="px-3 py-1 text-muted-foreground print:text-gray-600">{pack.containerName}</td>
                        <td className="px-3 py-1">{item.foodName}</td>
                        {ageGroups.map((ag) => (
                          <td key={ag.id} className="text-right px-2 py-1 tabular-nums border-l">
                            {pi === 0 ? (item.servingSizes.find((s) => s.ageGroupId === ag.id)?.display ?? "") : ""}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                      </tr>
                    ))
                  : (
                      <tr key={`${item.foodId}-${item.mealId}`} className="border-b last:border-b-0">
                        <td className="text-right px-3 py-1 text-muted-foreground">—</td>
                        <td className="px-3 py-1 text-muted-foreground">—</td>
                        <td className="px-3 py-1">{item.foodName}</td>
                        {ageGroups.map((ag) => (
                          <td key={ag.id} className="text-right px-2 py-1 tabular-nums border-l">
                            {item.servingSizes.find((s) => s.ageGroupId === ag.id)?.display ?? ""}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                        <td className="text-center px-2 py-1 text-muted-foreground border-l">—</td>
                      </tr>
                    )
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Milk — grouped by milk type, then list containers */}
      {milkGroups.length > 0 && (
        <div>
          <div className="px-4 py-1 bg-muted/20 print:bg-gray-100 border-b text-xs font-semibold text-muted-foreground print:text-gray-700">
            Milk
          </div>
          <table className="w-full text-xs">
            <tbody>
              {milkGroups.map((group) => (
                <React.Fragment key={group.label}>
                  <tr className="bg-muted/10">
                    <td colSpan={ageGroups.length + 4} className="px-3 py-0.5 font-medium text-xs">
                      {group.label}
                    </td>
                  </tr>
                  {group.items.map((m, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="text-right px-3 py-1 font-medium w-10">{m.qty}</td>
                      <td className="px-3 py-1" colSpan={ageGroups.length + 3}>{m.containerName}</td>
                    </tr>
                  ))}
                </React.Fragment>
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

  const displayDate = new Date(dateStr + "T00:00:00.000Z").toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const production = await prisma.production.findFirst({
    where: { productionDate: new Date(dateStr + "T00:00:00.000Z") },
    select: { id: true },
  });

  const tickets = production ? await getSnapshotDeliveryTickets(production.id) : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/reports?date=${dateStr}`} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Delivery Tickets — {displayDate}</h1>
        <PrintButton />
      </div>

      {!production ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No production run found for {displayDate}.{" "}
          <Link href="/production" className="font-medium underline">Go to Production</Link>{" "}
          to calculate it first.
        </div>
      ) : tickets.length === 0 ? (
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
