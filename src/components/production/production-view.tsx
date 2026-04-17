"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionResult, ProductionItem } from "@/lib/production";

export type ProductionDayData = {
  deliveryDateStr: string; // YYYY-MM-DD
  result: ProductionResult;
};

function ItemTable({ items }: { items: ProductionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 text-center">No items in this batch.</p>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Food Item</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Pk Size</TableHead>
            <TableHead className="text-right">Packs Needed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const packs = item.pkSize ? Math.ceil(item.totalAmount / item.pkSize) : null;
            return (
              <TableRow key={item.foodId}>
                <TableCell className="font-medium">{item.foodName}</TableCell>
                <TableCell className="text-right">
                  {item.totalAmount.toFixed(2)} {item.pkUnit ?? ""}
                </TableCell>
                <TableCell className="text-right">
                  {item.pkSize ? `${item.pkSize} ${item.pkUnit ?? ""}` : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">{packs ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TempGroup({ label, items, color }: { label: string; items: ProductionItem[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className={`text-sm font-medium ${color}`}>
        {label} ({items.length})
      </p>
      <ItemTable items={items} />
    </div>
  );
}

function BatchSection({
  batch,
  items,
}: {
  batch: "LSD" | "TomB";
  items: ProductionItem[];
}) {
  const hot = items.filter((i) => i.tempType === "hot");
  const cold = items.filter((i) => i.tempType === "cold");

  const label = batch === "LSD" ? "LSD — Today's Delivery" : "TomB — Tomorrow's Breakfast";
  const description =
    batch === "LSD"
      ? "Lunch · Dinner · Snack (unless delayed)"
      : "Breakfast · Snack (if delayed)";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={batch === "LSD" ? "default" : "secondary"}>{label}</Badge>
        <span className="text-xs text-muted-foreground">{description}</span>
        <span className="text-xs text-muted-foreground ml-auto">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">
          No items in this batch.
        </p>
      ) : (
        <div className="space-y-3">
          <TempGroup
            label="Hot"
            items={hot}
            color="text-orange-700 dark:text-orange-400"
          />
          <TempGroup
            label="Cold"
            items={cold}
            color="text-blue-700 dark:text-blue-400"
          />
        </div>
      )}
    </div>
  );
}

function DayPanel({ result }: { result: ProductionResult }) {
  if (result.all.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No production data for this date. Enter kid counts first.
      </p>
    );
  }
  return (
    <div className="space-y-8">
      <BatchSection batch="LSD" items={result.lsd} />
      <BatchSection batch="TomB" items={result.tomb} />
    </div>
  );
}

export function ProductionView({ days }: { days: ProductionDayData[] }) {
  const fmtDate = (str: string) => {
    const d = new Date(str + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (days.length === 1) {
    return <DayPanel result={days[0].result} />;
  }

  // Thursday: three delivery days in tabs
  return (
    <Tabs defaultValue="0">
      <TabsList className="mb-4">
        {days.map((day, i) => (
          <TabsTrigger key={i} value={String(i)}>
            {fmtDate(day.deliveryDateStr)}
          </TabsTrigger>
        ))}
      </TabsList>
      {days.map((day, i) => (
        <TabsContent key={i} value={String(i)}>
          <DayPanel result={day.result} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
