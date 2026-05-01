import { prisma } from "@/lib/db";
import type { PackResult } from "@/lib/containers";
import type {
  ContainerRow,
  MilkSchoolRow,
  ItemReportSection,
  ProductionSummarySection,
  DeliveryTicket,
  DeliveryTicketItem,
  DeliveryTicketMealCount,
  DeliveryTicketPackRow,
  DeliveryTicketMilkItem,
} from "@/lib/reports";
import type { ProductionItem } from "@/lib/production";

const MILK_OVERAGE: Record<string, number> = {
  small: 1.65,
  medium: 1.50,
  large: 1.05,
};

type SnapshotContainer = {
  containerSizeId: number;
  containerSize: { name: string; abbreviation: string };
  containerCount: number;
  partialQty: { toNumber(): number } | null;
};

function toPackResults(containers: SnapshotContainer[]): PackResult[] {
  return containers
    .filter((c) => c.containerCount > 0)
    .map((c) => ({
      containerSizeId: c.containerSizeId,
      sizeLabel: `${c.containerSize.name} (${c.containerSize.abbreviation})`,
      count: c.containerCount,
      isPartial: c.partialQty !== null,
    }));
}

// ─── Food Audit ───────────────────────────────────────────────────────────────
// Same shape as ProductionItem[] used by FoodAuditReport
export async function getSnapshotFoodAudit(productionId: number): Promise<ProductionItem[]> {
  const menus = await prisma.productionMenu.findMany({
    where: { productionId },
    include: {
      amounts: {
        include: {
          foodItem: true,
          containers: { include: { containerSize: true } },
        },
      },
    },
  });

  type Acc = {
    foodId: number;
    foodName: string;
    tempType: string;
    pkUnit: string | null;
    totalAmount: number;
    batch: "LSD" | "TomB";
    isBox: boolean;
    containers: SnapshotContainer[];
  };

  const agg = new Map<number, Acc>();

  for (const menu of menus) {
    const batch: "LSD" | "TomB" = menu.isLSD ? "LSD" : "TomB";
    for (const amt of menu.amounts) {
      const existing = agg.get(amt.foodItemId);
      if (existing) {
        existing.totalAmount += Number(amt.foodAmt);
        existing.containers.push(...amt.containers);
      } else {
        agg.set(amt.foodItemId, {
          foodId: amt.foodItemId,
          foodName: amt.foodItem.name,
          tempType: amt.foodItem.tempType,
          pkUnit: amt.foodItem.pkUnit,
          totalAmount: Number(amt.foodAmt),
          batch,
          isBox: menu.isBoxMenu,
          containers: [...amt.containers],
        });
      }
    }
  }

  return Array.from(agg.values())
    .sort((a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName))
    .map(({ containers, ...rest }) => ({
      ...rest,
      packs: toPackResults(containers),
    }));
}

// ─── Container Count ──────────────────────────────────────────────────────────
// Same shape as ContainerRow[] used by ContainerCountReport
export async function getSnapshotContainerReport(productionId: number): Promise<ContainerRow[]> {
  const menus = await prisma.productionMenu.findMany({
    where: { productionId },
    include: {
      amounts: {
        include: {
          foodItem: { include: { container: true } },
        },
      },
    },
  });

  type Acc = {
    foodId: number;
    foodName: string;
    tempType: string;
    totalAmount: number;
    pkUnit: string | null;
    pkSize: number | null;
    containerName: string | null;
    containerUnits: string | null;
  };

  const agg = new Map<number, Acc>();

  for (const menu of menus) {
    for (const amt of menu.amounts) {
      const existing = agg.get(amt.foodItemId);
      if (existing) {
        existing.totalAmount += Number(amt.foodAmt);
      } else {
        agg.set(amt.foodItemId, {
          foodId: amt.foodItemId,
          foodName: amt.foodItem.name,
          tempType: amt.foodItem.tempType,
          totalAmount: Number(amt.foodAmt),
          pkUnit: amt.foodItem.pkUnit,
          pkSize: amt.foodItem.pkSize ?? null,
          containerName: amt.foodItem.container?.name ?? null,
          containerUnits: amt.foodItem.container?.units ?? null,
        });
      }
    }
  }

  return Array.from(agg.values())
    .sort((a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName))
    .map((r) => ({
      ...r,
      packsNeeded: r.pkSize ? Math.ceil(r.totalAmount / r.pkSize) : null,
    }));
}

// ─── Milk Report ──────────────────────────────────────────────────────────────
// Same shape as MilkSchoolRow[] used by MilkReport
export async function getSnapshotMilkReport(productionId: number): Promise<MilkSchoolRow[]> {
  const milks = await prisma.productionMilk.findMany({
    where: { productionId },
    include: {
      school: { include: { route: true } },
      foodItem: true,
      milkType: true,
    },
  });

  type SchoolAcc = {
    schoolName: string;
    route: string | null;
    milkTier: string;
    items: Map<string, {
      foodId: number;
      foodName: string;
      mealName: string;
      rawAmount: number;
      pkSize: number | null;
      pkUnit: string | null;
    }>;
  };

  const schoolMap = new Map<number, SchoolAcc>();

  for (const milk of milks) {
    let schoolRow = schoolMap.get(milk.schoolId);
    if (!schoolRow) {
      schoolRow = {
        schoolName: milk.school.name,
        route: milk.school.route?.name ?? null,
        milkTier: milk.school.milkTier,
        items: new Map(),
      };
      schoolMap.set(milk.schoolId, schoolRow);
    }

    const key = `${milk.foodItemId}-${milk.milkTypeId}`;
    const existing = schoolRow.items.get(key);
    if (existing) {
      existing.rawAmount += Number(milk.foodAmt);
    } else {
      schoolRow.items.set(key, {
        foodId: milk.foodItemId,
        foodName: milk.foodItem.name,
        mealName: milk.milkType.name,
        rawAmount: Number(milk.foodAmt),
        pkSize: milk.foodItem.pkSize ?? null,
        pkUnit: milk.foodItem.pkUnit,
      });
    }
  }

  return Array.from(schoolMap.entries())
    .map(([schoolId, { schoolName, route, milkTier, items }]) => {
      const multiplier = MILK_OVERAGE[milkTier] ?? MILK_OVERAGE.medium;
      const overagePct = Math.round((multiplier - 1) * 100);

      const milkItemRows = Array.from(items.values())
        .sort((a, b) => a.mealName.localeCompare(b.mealName) || a.foodName.localeCompare(b.foodName))
        .map((item) => {
          const afterOverage = item.rawAmount * multiplier;
          const orderedUnits = item.pkSize ? Math.ceil(afterOverage / item.pkSize) : null;
          const orderedAmount =
            orderedUnits && item.pkSize ? orderedUnits * item.pkSize : Math.ceil(afterOverage);
          return { ...item, orderedUnits, orderedAmount };
        });

      return { schoolId, schoolName, route, milkTier, overagePct, items: milkItemRows };
    })
    .sort(
      (a, b) =>
        (a.route ?? "zzz").localeCompare(b.route ?? "zzz") ||
        a.schoolName.localeCompare(b.schoolName)
    );
}

// ─── Item Report ──────────────────────────────────────────────────────────────
// Same shape as ItemReportSection[] used by ItemReport
export async function getSnapshotItemReport(productionId: number): Promise<ItemReportSection[]> {
  const menus = await prisma.productionMenu.findMany({
    where: { productionId },
    include: {
      school: true,
      amounts: {
        include: {
          foodItem: {
            include: {
              container: { include: { sizes: { orderBy: { size: "desc" } } } },
            },
          },
          containers: { include: { containerSize: true } },
        },
      },
    },
  });

  type SchoolAcc = {
    schoolName: string;
    totalAmount: number;
    containers: SnapshotContainer[];
  };

  type FoodAcc = {
    foodId: number;
    foodName: string;
    tempType: string;
    pkUnit: string | null;
    containerName: string;
    containerSizes: { id: number; name: string; abbreviation: string; size: number }[];
    schools: Map<number, SchoolAcc>;
  };

  const foodMap = new Map<number, FoodAcc>();

  for (const menu of menus) {
    for (const amt of menu.amounts) {
      let foodAcc = foodMap.get(amt.foodItemId);
      if (!foodAcc) {
        foodAcc = {
          foodId: amt.foodItemId,
          foodName: amt.foodItem.name,
          tempType: amt.foodItem.tempType,
          pkUnit: amt.foodItem.pkUnit,
          containerName: amt.foodItem.container?.name ?? "",
          containerSizes:
            amt.foodItem.container?.sizes.map((s) => ({
              id: s.id,
              name: s.name,
              abbreviation: s.abbreviation,
              size: Number(s.size),
            })) ?? [],
          schools: new Map(),
        };
        foodMap.set(amt.foodItemId, foodAcc);
      }

      const existing = foodAcc.schools.get(menu.schoolId);
      if (existing) {
        existing.totalAmount += Number(amt.foodAmt);
        existing.containers.push(...amt.containers);
      } else {
        foodAcc.schools.set(menu.schoolId, {
          schoolName: menu.school.name,
          totalAmount: Number(amt.foodAmt),
          containers: [...amt.containers],
        });
      }
    }
  }

  return Array.from(foodMap.values())
    .sort((a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName))
    .map((fa) => {
      const rows = Array.from(fa.schools.values())
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
        .map((s) => ({
          schoolName: s.schoolName,
          totalAmount: s.totalAmount,
          packs: toPackResults(s.containers),
        }));

      return {
        foodId: fa.foodId,
        foodName: fa.foodName,
        pkUnit: fa.pkUnit,
        tempType: fa.tempType,
        containerName: fa.containerName,
        containerSizes: fa.containerSizes,
        rows,
        grandTotal: rows.reduce((sum, r) => sum + r.totalAmount, 0),
      };
    });
}

// ─── Production Summary ───────────────────────────────────────────────────────
// Same shape as ProductionSummarySection[] used by ProductionSummaryReport
export async function getSnapshotProductionSummary(
  productionId: number
): Promise<ProductionSummarySection[]> {
  const menus = await prisma.productionMenu.findMany({
    where: { productionId },
    include: {
      school: { include: { route: true } },
      menu: true,
      amounts: {
        include: { foodItem: true },
      },
    },
  });

  type RouteSchoolAcc = { schoolName: string; quantities: Map<number, number> };
  type RouteAcc = { routeName: string; schools: Map<number, RouteSchoolAcc> };
  type MenuAcc = {
    menuName: string;
    foodItems: Map<number, { foodId: number; foodName: string; pkUnit: string | null; tempType: string }>;
    routes: Map<number | null, RouteAcc>;
  };

  const menuMap = new Map<number, MenuAcc>();

  for (const menu of menus) {
    let menuAcc = menuMap.get(menu.menuId);
    if (!menuAcc) {
      menuAcc = { menuName: menu.menu.name, foodItems: new Map(), routes: new Map() };
      menuMap.set(menu.menuId, menuAcc);
    }

    const routeId = menu.school.routeId;
    const routeName = menu.school.route?.name ?? "No Route";

    let routeGroup = menuAcc.routes.get(routeId);
    if (!routeGroup) {
      routeGroup = { routeName, schools: new Map() };
      menuAcc.routes.set(routeId, routeGroup);
    }

    let schoolAcc = routeGroup.schools.get(menu.schoolId);
    if (!schoolAcc) {
      schoolAcc = { schoolName: menu.school.name, quantities: new Map() };
      routeGroup.schools.set(menu.schoolId, schoolAcc);
    }

    for (const amt of menu.amounts) {
      menuAcc.foodItems.set(amt.foodItemId, {
        foodId: amt.foodItemId,
        foodName: amt.foodItem.name,
        pkUnit: amt.foodItem.pkUnit,
        tempType: amt.foodItem.tempType,
      });
      schoolAcc.quantities.set(
        amt.foodItemId,
        (schoolAcc.quantities.get(amt.foodItemId) ?? 0) + Number(amt.foodAmt)
      );
    }
  }

  return Array.from(menuMap.entries())
    .sort(([, a], [, b]) => a.menuName.localeCompare(b.menuName))
    .map(([menuId, acc]) => {
      const foodItems = Array.from(acc.foodItems.values()).sort(
        (a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName)
      );

      const routes: ProductionSummarySection["routes"] = Array.from(acc.routes.entries())
        .sort(([, a], [, b]) => a.routeName.localeCompare(b.routeName))
        .map(([routeId, rg]) => {
          const schools = Array.from(rg.schools.values())
            .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
            .map((s) => ({
              schoolName: s.schoolName,
              quantities: Object.fromEntries(s.quantities),
            }));

          const totals: Record<number, number> = {};
          for (const s of schools) {
            for (const [fid, qty] of Object.entries(s.quantities)) {
              totals[Number(fid)] = (totals[Number(fid)] ?? 0) + qty;
            }
          }

          return { routeId, routeName: rg.routeName, schools, totals };
        });

      return { menuId, menuName: acc.menuName, foodItems, routes };
    });
}

// ─── Delivery Tickets ─────────────────────────────────────────────────────────
// Reads container counts from the production snapshot (ProductionContainer) instead
// of re-computing live, matching how Access reads from ProductionContainers.
export async function getSnapshotDeliveryTickets(productionId: number): Promise<DeliveryTicket[]> {
  const [productionMenus, productionMilks, ageGroups, meals] = await Promise.all([
    prisma.productionMenu.findMany({
      where: { productionId },
      include: {
        school: {
          include: {
            route: true,
            billingGroups: { include: { billingGroup: true } },
          },
        },
        menu: true,
        amounts: {
          include: {
            foodItem: true,
            containers: { include: { containerSize: true } },
          },
        },
      },
    }),
    prisma.productionMilk.findMany({
      where: { productionId },
      include: {
        milkType: true,
        containers: { include: { containerSize: true } },
      },
    }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
  ]);

  const schoolMenuIds = [...new Set(productionMenus.map((pm) => pm.schoolMenuId))];
  const foodItemIds = [...new Set(productionMenus.flatMap((pm) => pm.amounts.map((a) => a.foodItemId)))];
  const mealIds = [...new Set(productionMenus.flatMap((pm) => pm.amounts.map((a) => a.mealId)))];

  const [kidCounts, servingSizes] = await Promise.all([
    schoolMenuIds.length > 0
      ? prisma.kidCount.findMany({ where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } } })
      : Promise.resolve([]),
    foodItemIds.length > 0
      ? prisma.servingSize.findMany({ where: { foodItemId: { in: foodItemIds }, mealId: { in: mealIds } } })
      : Promise.resolve([]),
  ]);

  const mealNameMap = new Map(meals.map((m) => [m.id, m.name]));

  const servingSizeMap = new Map<string, number>();
  for (const ss of servingSizes) {
    servingSizeMap.set(`${ss.foodItemId}-${ss.mealId}-${ss.ageGroupId}`, Number(ss.servingSize));
  }

  // Kid counts: schoolMenuId → mealId → ageGroupId → count
  const kcMap = new Map<number, Map<number, Map<number, number>>>();
  for (const kc of kidCounts) {
    let byMeal = kcMap.get(kc.schoolMenuId);
    if (!byMeal) { byMeal = new Map(); kcMap.set(kc.schoolMenuId, byMeal); }
    let byAge = byMeal.get(kc.mealId);
    if (!byAge) { byAge = new Map(); byMeal.set(kc.mealId, byAge); }
    byAge.set(kc.ageGroupId, kc.count);
  }

  // Milk by school
  const milkBySchool = new Map<number, DeliveryTicketMilkItem[]>();
  for (const milk of productionMilks) {
    let items = milkBySchool.get(milk.schoolId);
    if (!items) { items = []; milkBySchool.set(milk.schoolId, items); }
    for (const c of milk.containers) {
      if (c.containerCount === 0) continue;
      items.push({
        qty: c.containerCount,
        containerName: c.containerSize.name,
        milkTypeName: milk.milkType.name,
        labelColor: milk.milkType.labelColor,
      });
    }
  }

  function fmtSize(size: number, unit: string | null): string {
    if (size === 0) return "";
    const str = size % 1 === 0 ? String(size) : Number(size.toFixed(4)).toString();
    return unit ? `${str} ${unit}` : str;
  }

  type AmtAcc = {
    foodItemId: number;
    foodName: string;
    mealId: number;
    tempType: string;
    pkUnit: string | null;
    containers: SnapshotContainer[];
  };

  type SchoolAcc = {
    pm: (typeof productionMenus)[number];
    schoolMenuIds: Set<number>;
    amts: Map<string, AmtAcc>;
  };

  const schoolMap = new Map<number, SchoolAcc>();

  for (const pm of productionMenus) {
    let acc = schoolMap.get(pm.schoolId);
    if (!acc) {
      acc = { pm, schoolMenuIds: new Set(), amts: new Map() };
      schoolMap.set(pm.schoolId, acc);
    }
    acc.schoolMenuIds.add(pm.schoolMenuId);

    for (const amt of pm.amounts) {
      const key = `${amt.foodItemId}-${amt.mealId}`;
      const existing = acc.amts.get(key);
      if (existing) {
        existing.containers.push(...(amt.containers as SnapshotContainer[]));
      } else {
        acc.amts.set(key, {
          foodItemId: amt.foodItemId,
          foodName: amt.foodItem.name,
          mealId: amt.mealId,
          tempType: amt.foodItem.tempType,
          pkUnit: amt.foodItem.pkUnit,
          containers: [...(amt.containers as SnapshotContainer[])],
        });
      }
    }
  }

  const result: DeliveryTicket[] = [];

  for (const [schoolId, acc] of schoolMap) {
    const school = acc.pm.school;

    // Meal counts aggregated from kid counts across all school menus
    const mealAgg = new Map<number, Map<number, number>>();
    for (const smId of acc.schoolMenuIds) {
      const byMeal = kcMap.get(smId);
      if (!byMeal) continue;
      for (const [mealId, byAge] of byMeal) {
        let agg = mealAgg.get(mealId);
        if (!agg) { agg = new Map(); mealAgg.set(mealId, agg); }
        for (const [agId, cnt] of byAge) {
          agg.set(agId, (agg.get(agId) ?? 0) + cnt);
        }
      }
    }

    const mealCounts: DeliveryTicketMealCount[] = meals
      .filter((m) => mealAgg.has(m.id))
      .map((m) => {
        const byAge = mealAgg.get(m.id)!;
        const counts: Record<number, number> = {};
        let total = 0;
        for (const ag of ageGroups) {
          const cnt = byAge.get(ag.id) ?? 0;
          counts[ag.id] = cnt;
          total += cnt;
        }
        return { mealId: m.id, mealName: m.name, counts, total };
      });

    const items: DeliveryTicketItem[] = Array.from(acc.amts.values())
      .sort((a, b) => {
        const mo = meals.findIndex((m) => m.id === a.mealId) - meals.findIndex((m) => m.id === b.mealId);
        if (mo !== 0) return mo;
        return a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName);
      })
      .map((amt) => {
        const packs: DeliveryTicketPackRow[] = amt.containers
          .filter((c) => c.containerCount > 0)
          .map((c) => ({
            qty: c.containerCount,
            containerName: `${c.containerSize.name} (${c.containerSize.abbreviation})`,
            isPartial: c.partialQty !== null,
          }));

        const servingSizes = ageGroups.map((ag) => ({
          ageGroupId: ag.id,
          display: fmtSize(
            servingSizeMap.get(`${amt.foodItemId}-${amt.mealId}-${ag.id}`) ?? 0,
            amt.pkUnit
          ),
        }));

        return {
          foodId: amt.foodItemId,
          foodName: amt.foodName,
          mealId: amt.mealId,
          mealName: mealNameMap.get(amt.mealId) ?? String(amt.mealId),
          tempType: amt.tempType,
          pkUnit: amt.pkUnit,
          packs,
          servingSizes,
        };
      });

    result.push({
      schoolId,
      schoolName: school.name,
      address: school.address ?? null,
      city: school.city ?? null,
      postalCode: school.postalCode ?? null,
      phone: school.phone ?? null,
      routeName: school.route?.name ?? null,
      driverName: school.route?.driver ?? null,
      billingGroupName: school.billingGroups[0]?.billingGroup.name ?? null,
      menuName: acc.pm.menu.name,
      ageGroups,
      mealCounts,
      items,
      milkItems: milkBySchool.get(schoolId) ?? [],
    });
  }

  return result.sort((a, b) => {
    const ra = a.routeName ?? "zzz";
    const rb = b.routeName ?? "zzz";
    return ra.localeCompare(rb) || a.schoolName.localeCompare(b.schoolName);
  });
}
