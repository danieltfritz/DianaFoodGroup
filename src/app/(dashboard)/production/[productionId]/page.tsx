import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";
import { DeleteProductionButton } from "@/components/production/delete-production-button";

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric", year: "numeric" });

function fmtAmt(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ productionId: string }>;
}) {
  const { productionId: idStr } = await params;
  const productionId = Number(idStr);
  if (isNaN(productionId)) notFound();

  const [production, meals] = await Promise.all([
    prisma.production.findUnique({
      where: { id: productionId },
      include: {
        menus: {
          include: {
            school: true,
            menu: true,
            amounts: {
              include: {
                foodItem: true,
                containers: {
                  include: { containerSize: true },
                },
              },
              orderBy: [{ mealId: "asc" }, { foodItem: { name: "asc" } }],
            },
          },
          orderBy: [{ isLSD: "desc" }, { school: { name: "asc" } }],
        },
        milks: {
          include: {
            school: true,
            foodItem: true,
            milkType: true,
            containers: {
              include: { containerSize: true },
            },
          },
          orderBy: [{ school: { name: "asc" } }, { milkType: { id: "asc" } }],
        },
      },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!production) notFound();

  const mealNameMap = new Map(meals.map((m) => [m.id, m.name]));
  const productionMenus = production.menus;
  const productionMilks = production.milks;

  // Group menus by LSD vs TomB, then by school
  const lsdMenus = productionMenus.filter((m) => m.isLSD);
  const tombMenus = productionMenus.filter((m) => m.isTomB);

  function formatContainers(containers: { containerSize: { abbreviation: string }; containerCount: number; partialQty: { toNumber(): number } | null }[]) {
    if (containers.length === 0) return "—";
    return containers
      .map((c) => {
        const partial = c.partialQty !== null ? ` (partial ${c.partialQty.toNumber()})` : "";
        return `${c.containerCount} × ${c.containerSize.abbreviation}${partial}`;
      })
      .join(" + ");
  }

  function AmtSection({ menus, label }: { menus: typeof productionMenus; label: string }) {
    const allAmounts = menus.flatMap((m) => m.amounts);
    if (allAmounts.length === 0) return null;

    // Aggregate by foodItem + meal across schools
    const aggKey = (foodItemId: number, mealId: number) => `${foodItemId}-${mealId}`;
    type AggRow = { foodItemId: number; foodName: string; mealId: number; total: number; containers: typeof allAmounts[0]["containers"] };
    const agg = new Map<string, AggRow>();

    for (const menu of menus) {
      for (const amt of menu.amounts) {
        const key = aggKey(amt.foodItemId, amt.mealId);
        const existing = agg.get(key);
        if (existing) {
          existing.total += Number(amt.foodAmt);
        } else {
          agg.set(key, {
            foodItemId: amt.foodItemId,
            foodName: amt.foodItem.name,
            mealId: amt.mealId,
            total: Number(amt.foodAmt),
            containers: amt.containers,
          });
        }
      }
    }

    const rows = [...agg.values()].sort((a, b) => a.mealId - b.mealId || a.foodName.localeCompare(b.foodName));
    const schoolCount = new Set(menus.map((m) => m.schoolId)).size;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={label === "LSD" ? "default" : "secondary"}>{label}</Badge>
          <span className="text-xs text-muted-foreground">{schoolCount} schools · {rows.length} items</span>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Food Item</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Containers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.foodItemId}-${row.mealId}`}>
                  <TableCell className="font-medium">{row.foodName}</TableCell>
                  <TableCell className="text-muted-foreground">{mealNameMap.get(row.mealId) ?? row.mealId}</TableCell>
                  <TableCell className="text-right font-mono">{fmtAmt(row.total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatContainers(row.containers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/production" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Production — {fmtDate(production.productionDate)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Delivering {fmtDate(production.deliveryDate)}
            {" · "}
            LSD serving {fmtDate(production.servingDateLSD)}
            {" · "}
            Breakfast serving {fmtDate(production.servingDateB)}
          </p>
        </div>
        <DeleteProductionButton productionId={production.id} />
      </div>

      {/* Food amounts by batch */}
      <div className="space-y-6">
        <AmtSection menus={lsdMenus} label="LSD" />
        <AmtSection menus={tombMenus} label="TomB" />
      </div>

      {/* Milk */}
      {productionMilks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Milk</Badge>
            <span className="text-xs text-muted-foreground">
              {new Set(productionMilks.map((m) => m.schoolId)).size} schools
            </span>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Milk Type</TableHead>
                  <TableHead className="text-right">Amount (oz)</TableHead>
                  <TableHead>Containers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionMilks.map((milk) => (
                  <TableRow key={milk.id}>
                    <TableCell className="font-medium">{milk.school.name}</TableCell>
                    <TableCell className="text-muted-foreground">{milk.milkType.name}</TableCell>
                    <TableCell className="text-right font-mono">{fmtAmt(Number(milk.foodAmt))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatContainers(milk.containers)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
