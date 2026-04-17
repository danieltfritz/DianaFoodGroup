import { calculateProduction, getDeliveryDatesForProductionDate } from "@/lib/production";
import { DateNav } from "@/components/kid-counts/date-nav";
import { ProductionView } from "@/components/production/production-view";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const productionDate = new Date(dateStr + "T00:00:00");

  const deliveryDates = getDeliveryDatesForProductionDate(productionDate);
  const results = await Promise.all(deliveryDates.map((d) => calculateProduction(d)));

  const days = deliveryDates.map((d, i) => ({
    deliveryDateStr: d.toISOString().split("T")[0],
    result: results[i],
  }));

  const productionLabel = productionDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const isThursday = deliveryDates.length > 1;
  const deliveryLabel = isThursday
    ? "Friday + Saturday + Sunday delivery"
    : deliveryDates[0].toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Producing on <strong>{productionLabel}</strong>
            {" · "}
            Delivering <strong>{deliveryLabel}</strong>
          </p>
        </div>
        <DateNav date={dateStr} />
      </div>

      <ProductionView days={days} />
    </div>
  );
}
