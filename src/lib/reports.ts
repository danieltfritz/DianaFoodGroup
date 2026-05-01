import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId, schoolDeliversOn } from "@/lib/cycle";
import { packContainers, type PackResult, type ContainerSizeInput } from "@/lib/containers";

// ─── Shared helper ────────────────────────────────────────────────────────────

type DeliverySchoolMenu = {
  id: number;
  schoolId: number;
  menuId: number;
  school: {
    id: number;
    name: string;
    routeId: number | null;
    milkTier: string;
    deliveryMon: boolean;
    deliveryTue: boolean;
    deliveryWed: boolean;
    deliveryThu: boolean;
    deliveryFri: boolean;
    deliverySat: boolean;
    deliverySun: boolean;
    route: { id: number; name: string; driver: string | null } | null;
    billingGroups: { billingGroup: { name: string } }[];
    address: string | null;
    city: string | null;
    postalCode: string | null;
    phone: string | null;
  };
  menu: {
    id: number;
    name: string;
    cycleWeeks: number;
    effectiveDate: Date;
    isBoxMenu: boolean;
    delaySnack: boolean;
  };
};

async function getDeliverySchoolMenus(date: Date): Promise<DeliverySchoolMenu[]> {
  const [schoolMenus, closings] = await Promise.all([
    prisma.schoolMenu.findMany({
      where: {
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: {
        school: {
          include: {
            route: true,
            billingGroups: { include: { billingGroup: true } },
          },
        },
        menu: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    }),
  ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));
  const result: DeliverySchoolMenu[] = [];

  for (const sm of schoolMenus) {
    if (closedIds.has(sm.schoolId)) continue;
    if (!schoolDeliversOn(sm.school, date)) continue;
    result.push(sm as DeliverySchoolMenu);
  }

  return result;
}

// ─── School Summary ───────────────────────────────────────────────────────────

export type SchoolSummaryRow = {
  schoolId: number;
  schoolName: string;
  route: string | null;
  isClosed: boolean;
  meals: {
    mealId: number;
    mealName: string;
    ageGroups: { ageGroupId: number; ageGroupName: string; count: number }[];
    total: number;
  }[];
  grandTotal: number;
};

export async function getSchoolSummary(deliveryDate: Date): Promise<SchoolSummaryRow[]> {
  const [deliveryMenus, meals, ageGroups] = await Promise.all([
    getDeliverySchoolMenus(deliveryDate),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const kidCounts = await prisma.kidCount.findMany({
    where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
  });

  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));
  const schoolMap = new Map<number, SchoolSummaryRow>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    let row = schoolMap.get(kc.schoolId);
    if (!row) {
      row = {
        schoolId: kc.schoolId,
        schoolName: dm.school.name,
        route: dm.school.route?.name ?? null,
        isClosed: false,
        meals: meals.map((m) => ({
          mealId: m.id,
          mealName: m.name,
          ageGroups: ageGroups.map((a) => ({ ageGroupId: a.id, ageGroupName: a.name, count: 0 })),
          total: 0,
        })),
        grandTotal: 0,
      };
      schoolMap.set(kc.schoolId, row);
    }

    const mealRow = row.meals.find((m) => m.mealId === kc.mealId);
    if (mealRow) {
      const agRow = mealRow.ageGroups.find((a) => a.ageGroupId === kc.ageGroupId);
      if (agRow) agRow.count = kc.count;
      mealRow.total += kc.count;
      row.grandTotal += kc.count;
    }
  }

  return Array.from(schoolMap.values()).sort((a, b) => {
    const ra = a.route ?? "zzz";
    const rb = b.route ?? "zzz";
    return ra.localeCompare(rb) || a.schoolName.localeCompare(b.schoolName);
  });
}

// ─── Container Count ──────────────────────────────────────────────────────────

export type ContainerRow = {
  foodId: number;
  foodName: string;
  tempType: string;
  totalAmount: number;
  pkUnit: string | null;
  pkSize: number | null;
  packsNeeded: number | null;
  containerName: string | null;
  containerUnits: string | null;
};

export async function getContainerReport(deliveryDate: Date): Promise<ContainerRow[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);
  const deliveryMenus = await getDeliverySchoolMenus(date);
  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const kidCounts = await prisma.kidCount.findMany({
    where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
  });

  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  const foodTotals = new Map<
    number,
    { amount: number; food: { pkSize: number | null; pkUnit: string | null; name: string; tempType: string; container: { name: string; units: string | null } | null } }
  >();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    const menu = dm.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, mealId: kc.mealId, week: cycleWeek, dayId },
      include: { foodItem: { include: { container: true } } },
    });

    for (const mi of menuItems) {
      const ss = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: mi.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!ss) continue;

      const amount = kc.count * Number(ss.servingSize);
      const existing = foodTotals.get(mi.foodItemId);
      if (existing) {
        existing.amount += amount;
      } else {
        foodTotals.set(mi.foodItemId, {
          amount,
          food: {
            pkSize: mi.foodItem.pkSize,
            pkUnit: mi.foodItem.pkUnit,
            name: mi.foodItem.name,
            tempType: mi.foodItem.tempType,
            container: mi.foodItem.container
              ? { name: mi.foodItem.container.name, units: mi.foodItem.container.units }
              : null,
          },
        });
      }
    }
  }

  return Array.from(foodTotals.entries())
    .map(([foodId, { amount, food }]) => ({
      foodId,
      foodName: food.name,
      tempType: food.tempType,
      totalAmount: amount,
      pkUnit: food.pkUnit,
      pkSize: food.pkSize,
      packsNeeded: food.pkSize ? Math.ceil(amount / food.pkSize) : null,
      containerName: food.container?.name ?? null,
      containerUnits: food.container?.units ?? null,
    }))
    .sort((a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName));
}

// ─── Milk Report ──────────────────────────────────────────────────────────────

const MILK_OVERAGE: Record<string, number> = {
  small: 1.65,
  medium: 1.50,
  large: 1.05,
};

export type MilkItem = {
  foodId: number;
  foodName: string;
  mealName: string;
  rawAmount: number;
  pkSize: number | null;
  pkUnit: string | null;
  orderedUnits: number | null;
  orderedAmount: number;
};

export type MilkSchoolRow = {
  schoolId: number;
  schoolName: string;
  route: string | null;
  milkTier: string;
  overagePct: number;
  items: MilkItem[];
};

export async function getMilkReport(deliveryDate: Date): Promise<MilkSchoolRow[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);
  const deliveryMenus = await getDeliverySchoolMenus(date);
  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const kidCounts = await prisma.kidCount.findMany({
    where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
  });

  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  type SchoolAcc = {
    schoolName: string;
    route: string | null;
    milkTier: string;
    items: Map<string, { foodId: number; foodName: string; mealName: string; rawAmount: number; pkSize: number | null; pkUnit: string | null }>;
  };

  const schoolMap = new Map<number, SchoolAcc>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    const menu = dm.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const milkItems = await prisma.menuItem.findMany({
      where: {
        menuId: menu.id,
        mealId: kc.mealId,
        week: cycleWeek,
        dayId,
        foodItem: { isMilk: true },
      },
      include: { foodItem: true },
    });

    for (const mi of milkItems) {
      const ss = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: mi.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!ss) continue;

      const amount = kc.count * Number(ss.servingSize);
      let schoolRow = schoolMap.get(kc.schoolId);
      if (!schoolRow) {
        schoolRow = {
          schoolName: dm.school.name,
          route: dm.school.route?.name ?? null,
          milkTier: dm.school.milkTier,
          items: new Map(),
        };
        schoolMap.set(kc.schoolId, schoolRow);
      }

      const key = `${mi.foodItemId}-${kc.mealId}`;
      const existing = schoolRow.items.get(key);
      if (existing) {
        existing.rawAmount += amount;
      } else {
        schoolRow.items.set(key, {
          foodId: mi.foodItemId,
          foodName: mi.foodItem.name,
          mealName: kc.mealId.toString(),
          rawAmount: amount,
          pkSize: mi.foodItem.pkSize,
          pkUnit: mi.foodItem.pkUnit,
        });
      }
    }
  }

  return Array.from(schoolMap.entries())
    .map(([schoolId, { schoolName, route, milkTier, items }]) => {
      const multiplier = MILK_OVERAGE[milkTier] ?? MILK_OVERAGE.medium;
      const overagePct = Math.round((multiplier - 1) * 100);

      const milkItemRows: MilkItem[] = Array.from(items.values())
        .sort((a, b) => a.mealName.localeCompare(b.mealName) || a.foodName.localeCompare(b.foodName))
        .map((item) => {
          const afterOverage = item.rawAmount * multiplier;
          const orderedUnits = item.pkSize ? Math.ceil(afterOverage / item.pkSize) : null;
          const orderedAmount = orderedUnits && item.pkSize
            ? orderedUnits * item.pkSize
            : Math.ceil(afterOverage);
          return { ...item, orderedUnits, orderedAmount };
        });

      return { schoolId, schoolName, route, milkTier, overagePct, items: milkItemRows };
    })
    .sort((a, b) => (a.route ?? "zzz").localeCompare(b.route ?? "zzz") || a.schoolName.localeCompare(b.schoolName));
}

// ─── Fruit Report ────────────────────────────────────────────────────────────

export type FruitItem = {
  foodName: string;
  totalAmount: number;
  pkUnit: string | null;
};

export type FruitReportRow = {
  date: Date;
  schoolName: string;
  route: string | null;
  items: FruitItem[];
};

export async function getFruitReport(startDate: Date, endDate: Date): Promise<FruitReportRow[]> {
  const fruitTypes = await prisma.foodType.findMany({
    where: { name: { contains: "fruit" } },
    select: { id: true },
  });
  if (fruitTypes.length === 0) return [];
  const fruitTypeIds = fruitTypes.map((t) => t.id);

  const results: FruitReportRow[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const date = new Date(current);
    const deliveryMenus = await getDeliverySchoolMenus(date);

    if (deliveryMenus.length > 0) {
      const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
      const kidCounts = await prisma.kidCount.findMany({
        where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
      });
      const dayId = getDayId(date);
      const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

      type RowAcc = { date: Date; schoolName: string; route: string | null; items: Map<number, FruitItem> };
      const rowMap = new Map<string, RowAcc>();

      for (const kc of kidCounts) {
        const dm = smMap.get(kc.schoolMenuId)!;
        const menu = dm.menu;
        const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

        const fruitMenuItems = await prisma.menuItem.findMany({
          where: {
            menuId: menu.id,
            mealId: kc.mealId,
            week: cycleWeek,
            dayId,
            foodItem: { foodTypeId: { in: fruitTypeIds } },
          },
          include: { foodItem: true },
        });

        if (fruitMenuItems.length === 0) continue;

        const key = `${date.toISOString().split("T")[0]}-${kc.schoolId}`;
        let row = rowMap.get(key);
        if (!row) {
          row = {
            date,
            schoolName: dm.school.name,
            route: dm.school.route?.name ?? null,
            items: new Map(),
          };
          rowMap.set(key, row);
        }

        for (const mi of fruitMenuItems) {
          const ss = await prisma.servingSize.findUnique({
            where: {
              mealId_foodItemId_ageGroupId: {
                mealId: kc.mealId,
                foodItemId: mi.foodItemId,
                ageGroupId: kc.ageGroupId,
              },
            },
          });
          if (!ss) continue;

          const amount = kc.count * Number(ss.servingSize);
          const existing = row.items.get(mi.foodItemId);
          if (existing) {
            existing.totalAmount += amount;
          } else {
            row.items.set(mi.foodItemId, {
              foodName: mi.foodItem.name,
              totalAmount: amount,
              pkUnit: mi.foodItem.pkUnit,
            });
          }
        }
      }

      results.push(
        ...Array.from(rowMap.values())
          .filter((r) => r.items.size > 0)
          .map((r) => ({ ...r, items: Array.from(r.items.values()) }))
      );
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

// ─── Item Report ──────────────────────────────────────────────────────────────

export type ItemReportRow = {
  schoolName: string;
  totalAmount: number;
  packs: PackResult[];
};

export type ItemReportSection = {
  foodId: number;
  foodName: string;
  pkUnit: string | null;
  tempType: string;
  containerName: string;
  containerSizes: ContainerSizeInput[];
  rows: ItemReportRow[];
  grandTotal: number;
};

export async function getItemReport(deliveryDate: Date): Promise<ItemReportSection[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);
  const deliveryMenus = await getDeliverySchoolMenus(date);
  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const kidCounts = await prisma.kidCount.findMany({
    where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
  });

  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  type FoodSchoolAcc = { schoolName: string; totalAmount: number };
  type FoodAcc = {
    foodId: number;
    foodName: string;
    tempType: string;
    pkUnit: string | null;
    containerName: string;
    containerSizes: ContainerSizeInput[];
    containerStrategy: string;
    containerThreshold: number | null;
    schools: Map<number, FoodSchoolAcc>;
  };

  const foodMap = new Map<number, FoodAcc>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    const menu = dm.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, mealId: kc.mealId, week: cycleWeek, dayId },
      include: {
        foodItem: {
          include: {
            container: { include: { sizes: { orderBy: { size: "desc" } } } },
          },
        },
      },
    });

    for (const mi of menuItems) {
      const ss = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: mi.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!ss) continue;

      const amount = kc.count * Number(ss.servingSize);

      let foodAcc = foodMap.get(mi.foodItemId);
      if (!foodAcc) {
        const containerSizes: ContainerSizeInput[] =
          mi.foodItem.container?.sizes.map((s) => ({
            id: s.id,
            name: s.name,
            abbreviation: s.abbreviation,
            size: Number(s.size),
          })) ?? [];

        foodAcc = {
          foodId: mi.foodItemId,
          foodName: mi.foodItem.name,
          tempType: mi.foodItem.tempType,
          pkUnit: mi.foodItem.pkUnit,
          containerName: mi.foodItem.container?.name ?? "",
          containerSizes,
          containerStrategy: mi.foodItem.containerStrategy,
          containerThreshold: mi.foodItem.containerThreshold
            ? Number(mi.foodItem.containerThreshold)
            : null,
          schools: new Map(),
        };
        foodMap.set(mi.foodItemId, foodAcc);
      }

      const schoolAcc = foodAcc.schools.get(kc.schoolId);
      if (schoolAcc) {
        schoolAcc.totalAmount += amount;
      } else {
        foodAcc.schools.set(kc.schoolId, { schoolName: dm.school.name, totalAmount: amount });
      }
    }
  }

  return Array.from(foodMap.values())
    .map((fa) => {
      const rows: ItemReportRow[] = Array.from(fa.schools.values())
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
        .map((s) => ({
          schoolName: s.schoolName,
          totalAmount: s.totalAmount,
          packs: packContainers(s.totalAmount, fa.containerSizes, fa.containerStrategy, fa.containerThreshold),
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
    })
    .sort((a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName));
}

// ─── Milk Count Report ───────────────────────────────────────────────────────

export type MilkCountColumn = {
  key: string; // `${ageGroupId}-${milkTypeId}`
  ageGroupId: number;
  ageGroupName: string;
  milkTypeId: number;
  name: string;
  labelColor: string;
};

export type MilkCountSchoolRow = {
  schoolId: number;
  schoolName: string;
  counts: Record<string, number>;
};

export type MilkCountRouteGroup = {
  routeId: number | null;
  routeName: string;
  schools: MilkCountSchoolRow[];
  totals: Record<string, number>;
};

export type MilkCountReportData = {
  columns: MilkCountColumn[];
  routes: MilkCountRouteGroup[];
  grandTotals: Record<string, number>;
};

export async function getMilkCountReport(deliveryDate: Date): Promise<MilkCountReportData> {
  const deliveryMenus = await getDeliverySchoolMenus(deliveryDate);
  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  const [records, milkTypes, ageGroups] = await Promise.all([
    prisma.milkCount.findMany({
      where: {
        schoolMenuId: schoolMenuIds.length > 0 ? { in: schoolMenuIds } : { in: [-1] },
        count: { gt: 0 },
      },
      include: { milkType: true },
      orderBy: [{ schoolId: "asc" }],
    }),
    prisma.milkType.findMany(),
    prisma.ageGroup.findMany(),
  ]);
  const ageGroupMap = new Map(ageGroups.map((a) => [a.id, a.name]));

  const columnMap = new Map<string, MilkCountColumn>();
  const routeMap = new Map<number | null, { routeName: string; schoolMap: Map<number, { schoolId: number; schoolName: string; counts: Map<string, number> }> }>();

  for (const r of records) {
    const colKey = `${r.ageGroupId}-${r.milkTypeId}`;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, {
        key: colKey,
        ageGroupId: r.ageGroupId,
        ageGroupName: ageGroupMap.get(r.ageGroupId) ?? String(r.ageGroupId),
        milkTypeId: r.milkTypeId,
        name: r.milkType.name,
        labelColor: r.milkType.labelColor,
      });
    }

    const dm = smMap.get(r.schoolMenuId);
    const routeId = dm?.school.routeId ?? null;
    const routeName = dm?.school.route?.name ?? "No Route";

    let routeAcc = routeMap.get(routeId);
    if (!routeAcc) {
      routeAcc = { routeName, schoolMap: new Map() };
      routeMap.set(routeId, routeAcc);
    }

    let schoolAcc = routeAcc.schoolMap.get(r.schoolId);
    if (!schoolAcc) {
      schoolAcc = { schoolId: r.schoolId, schoolName: dm?.school.name ?? String(r.schoolId), counts: new Map() };
      routeAcc.schoolMap.set(r.schoolId, schoolAcc);
    }

    schoolAcc.counts.set(colKey, (schoolAcc.counts.get(colKey) ?? 0) + r.count);
  }

  const columns = Array.from(columnMap.values()).sort((a, b) =>
    a.ageGroupId !== b.ageGroupId ? a.ageGroupId - b.ageGroupId : a.milkTypeId - b.milkTypeId
  );

  const routes: MilkCountRouteGroup[] = Array.from(routeMap.entries())
    .sort(([, a], [, b]) => a.routeName.localeCompare(b.routeName))
    .map(([routeId, acc]) => {
      const schools: MilkCountSchoolRow[] = Array.from(acc.schoolMap.values())
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
        .map((s) => ({ schoolId: s.schoolId, schoolName: s.schoolName, counts: Object.fromEntries(s.counts) }));

      const totals: Record<string, number> = {};
      for (const s of schools) {
        for (const [key, cnt] of Object.entries(s.counts)) {
          totals[key] = (totals[key] ?? 0) + cnt;
        }
      }

      return { routeId, routeName: acc.routeName, schools, totals };
    });

  const grandTotals: Record<string, number> = {};
  for (const route of routes) {
    for (const [key, cnt] of Object.entries(route.totals)) {
      grandTotals[key] = (grandTotals[key] ?? 0) + cnt;
    }
  }

  return { columns, routes, grandTotals };
}

// ─── Delivery Tickets ────────────────────────────────────────────────────────

export type DeliveryTicketPackRow = {
  qty: number;
  containerName: string;
  isPartial: boolean;
};

export type DeliveryTicketItem = {
  foodId: number;
  foodName: string;
  mealId: number;
  mealName: string;
  tempType: string;
  pkUnit: string | null;
  packs: DeliveryTicketPackRow[];
  servingSizes: { ageGroupId: number; display: string }[];
};

export type DeliveryTicketMealCount = {
  mealId: number;
  mealName: string;
  counts: Record<number, number>;
  total: number;
};

export type DeliveryTicketMilkItem = {
  qty: number;
  containerName: string;
  milkTypeName: string;
  labelColor: string;
};

export type DeliveryTicket = {
  schoolId: number;
  schoolName: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  routeName: string | null;
  driverName: string | null;
  billingGroupName: string | null;
  menuName: string | null;
  ageGroups: { id: number; name: string }[];
  mealCounts: DeliveryTicketMealCount[];
  items: DeliveryTicketItem[];
  milkItems: DeliveryTicketMilkItem[];
};

function formatServingSize(size: number, unit: string | null): string {
  if (size === 0) return "";
  const str = size % 1 === 0 ? String(size) : String(Number(size.toFixed(4)));
  return unit ? `${str} ${unit}` : str;
}

export async function getDeliveryTickets(deliveryDate: Date): Promise<DeliveryTicket[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);

  const [ageGroups, meals, deliveryMenus] = await Promise.all([
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    getDeliverySchoolMenus(date),
  ]);

  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  const [kidCounts, milkCounts] = await Promise.all([
    prisma.kidCount.findMany({
      where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
    }),
    prisma.milkCount.findMany({
      where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
      include: { milkType: true },
    }),
  ]);

  type ItemAcc = {
    foodId: number;
    foodName: string;
    mealId: number;
    mealName: string;
    tempType: string;
    pkUnit: string | null;
    containerSizes: ContainerSizeInput[];
    containerStrategy: string;
    containerThreshold: number | null;
    totalAmount: number;
    servingSizeByAge: Map<number, number>;
  };

  type SchoolAcc = {
    dm: DeliverySchoolMenu;
    mealCounts: Map<number, { mealName: string; counts: Map<number, number> }>;
    items: Map<string, ItemAcc>;
  };

  const schoolMap = new Map<number, SchoolAcc>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    let acc = schoolMap.get(kc.schoolId);
    if (!acc) {
      acc = { dm, mealCounts: new Map(), items: new Map() };
      schoolMap.set(kc.schoolId, acc);
    }

    const mealObj = meals.find((m) => m.id === kc.mealId);
    let mealCount = acc.mealCounts.get(kc.mealId);
    if (!mealCount) {
      mealCount = { mealName: mealObj?.name ?? String(kc.mealId), counts: new Map() };
      acc.mealCounts.set(kc.mealId, mealCount);
    }
    mealCount.counts.set(kc.ageGroupId, (mealCount.counts.get(kc.ageGroupId) ?? 0) + kc.count);

    const menu = dm.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, mealId: kc.mealId, week: cycleWeek, dayId },
      include: {
        foodItem: {
          include: { container: { include: { sizes: { orderBy: { size: "desc" } } } } },
        },
      },
    });

    for (const mi of menuItems) {
      const ss = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: mi.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!ss) continue;

      const ssVal = Number(ss.servingSize);
      const amount = kc.count * ssVal;
      const key = `${mi.foodItemId}-${kc.mealId}`;

      let item = acc.items.get(key);
      if (!item) {
        item = {
          foodId: mi.foodItemId,
          foodName: mi.foodItem.name,
          mealId: kc.mealId,
          mealName: mealObj?.name ?? String(kc.mealId),
          tempType: mi.foodItem.tempType,
          pkUnit: mi.foodItem.pkUnit,
          containerSizes: mi.foodItem.container?.sizes.map((s) => ({
            id: s.id,
            name: s.name,
            abbreviation: s.abbreviation,
            size: Number(s.size),
          })) ?? [],
          containerStrategy: mi.foodItem.containerStrategy,
          containerThreshold: mi.foodItem.containerThreshold ? Number(mi.foodItem.containerThreshold) : null,
          totalAmount: 0,
          servingSizeByAge: new Map(),
        };
        acc.items.set(key, item);
      }
      item.totalAmount += amount;
      item.servingSizeByAge.set(kc.ageGroupId, ssVal);
    }
  }

  const ageGroupNameMap = new Map(ageGroups.map((a) => [a.id, a.name]));
  const milkBySchool = new Map<number, Map<string, { qty: number; containerName: string; milkTypeName: string; labelColor: string }>>();
  for (const mc of milkCounts) {
    let schoolMilk = milkBySchool.get(mc.schoolId);
    if (!schoolMilk) { schoolMilk = new Map(); milkBySchool.set(mc.schoolId, schoolMilk); }
    const colKey = `${mc.ageGroupId}-${mc.milkTypeId}`;
    const existing = schoolMilk.get(colKey);
    if (existing) existing.qty += mc.count;
    else schoolMilk.set(colKey, { qty: mc.count, containerName: ageGroupNameMap.get(mc.ageGroupId) ?? String(mc.ageGroupId), milkTypeName: mc.milkType.name, labelColor: mc.milkType.labelColor });
  }

  return Array.from(schoolMap.entries())
    .sort(([, a], [, b]) => {
      const ra = a.dm.school.route?.name ?? "zzz";
      const rb = b.dm.school.route?.name ?? "zzz";
      return ra.localeCompare(rb) || a.dm.school.name.localeCompare(b.dm.school.name);
    })
    .map(([schoolId, acc]) => {
      const mealCounts: DeliveryTicketMealCount[] = meals
        .filter((m) => acc.mealCounts.has(m.id))
        .map((m) => {
          const mc = acc.mealCounts.get(m.id)!;
          const counts: Record<number, number> = {};
          let total = 0;
          for (const ag of ageGroups) {
            const cnt = mc.counts.get(ag.id) ?? 0;
            counts[ag.id] = cnt;
            total += cnt;
          }
          return { mealId: m.id, mealName: m.name, counts, total };
        });

      const items: DeliveryTicketItem[] = Array.from(acc.items.values())
        .sort((a, b) => {
          const mealOrder = meals.findIndex((m) => m.id === a.mealId) - meals.findIndex((m) => m.id === b.mealId);
          if (mealOrder !== 0) return mealOrder;
          const tempOrder = a.tempType.localeCompare(b.tempType);
          if (tempOrder !== 0) return tempOrder;
          return a.foodName.localeCompare(b.foodName);
        })
        .map((item) => {
          const packResults = packContainers(item.totalAmount, item.containerSizes, item.containerStrategy, item.containerThreshold);
          const packs: DeliveryTicketPackRow[] = packResults.map((p) => ({
            qty: p.count,
            containerName: p.sizeLabel,
            isPartial: p.isPartial,
          }));
          const servingSizes = ageGroups.map((ag) => ({
            ageGroupId: ag.id,
            display: item.servingSizeByAge.has(ag.id)
              ? formatServingSize(item.servingSizeByAge.get(ag.id)!, item.pkUnit)
              : "",
          }));
          return {
            foodId: item.foodId,
            foodName: item.foodName,
            mealId: item.mealId,
            mealName: item.mealName,
            tempType: item.tempType,
            pkUnit: item.pkUnit,
            packs,
            servingSizes,
          };
        });

      const schoolMilk = milkBySchool.get(schoolId);
      const milkItems: DeliveryTicketMilkItem[] = schoolMilk
        ? Array.from(schoolMilk.values())
        : [];

      return {
        schoolId,
        schoolName: acc.dm.school.name,
        address: acc.dm.school.address ?? null,
        city: acc.dm.school.city ?? null,
        postalCode: acc.dm.school.postalCode ?? null,
        phone: acc.dm.school.phone ?? null,
        routeName: acc.dm.school.route?.name ?? null,
        driverName: acc.dm.school.route?.driver ?? null,
        billingGroupName: acc.dm.school.billingGroups[0]?.billingGroup.name ?? null,
        menuName: acc.dm.menu.name,
        ageGroups,
        mealCounts,
        items,
        milkItems,
      };
    });
}

// ─── Daily Kid Count Report ───────────────────────────────────────────────────

export type KidCountMealRow = {
  mealId: number;
  mealName: string;
  counts: Record<number, number>;
  total: number;
};

export type KidCountMenuSection = {
  menuId: number;
  menuName: string;
  meals: KidCountMealRow[];
  totals: Record<number, number>;
  grandTotal: number;
};

export type DailyKidCountReport = {
  ageGroups: { id: number; name: string }[];
  sections: KidCountMenuSection[];
  grandTotals: Record<number, number>;
  grandTotal: number;
};

export async function getDailyKidCountReport(deliveryDate: Date): Promise<DailyKidCountReport> {
  const [ageGroups, meals, deliveryMenus] = await Promise.all([
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    getDeliverySchoolMenus(deliveryDate),
  ]);

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      schoolMenuId: schoolMenuIds.length > 0 ? { in: schoolMenuIds } : { in: [-1] },
      count: { gt: 0 },
    },
  });

  const menuMap = new Map<number, { menuName: string; meals: Map<number, Map<number, number>> }>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    const menu = dm.menu;
    let menuAcc = menuMap.get(menu.id);
    if (!menuAcc) {
      menuAcc = { menuName: menu.name, meals: new Map() };
      menuMap.set(menu.id, menuAcc);
    }
    let mealAcc = menuAcc.meals.get(kc.mealId);
    if (!mealAcc) {
      mealAcc = new Map();
      menuAcc.meals.set(kc.mealId, mealAcc);
    }
    mealAcc.set(kc.ageGroupId, (mealAcc.get(kc.ageGroupId) ?? 0) + kc.count);
  }

  const grandTotals: Record<number, number> = {};

  const sections: KidCountMenuSection[] = Array.from(menuMap.entries())
    .sort(([, a], [, b]) => a.menuName.localeCompare(b.menuName))
    .map(([menuId, acc]) => {
      const mealRows: KidCountMealRow[] = meals
        .filter((m) => acc.meals.has(m.id))
        .map((m) => {
          const agMap = acc.meals.get(m.id)!;
          const counts: Record<number, number> = {};
          let total = 0;
          for (const ag of ageGroups) {
            const cnt = agMap.get(ag.id) ?? 0;
            counts[ag.id] = cnt;
            total += cnt;
          }
          return { mealId: m.id, mealName: m.name, counts, total };
        });

      const totals: Record<number, number> = {};
      let grandTotal = 0;
      for (const ag of ageGroups) {
        const sum = mealRows.reduce((s, r) => s + (r.counts[ag.id] ?? 0), 0);
        totals[ag.id] = sum;
        grandTotal += sum;
        grandTotals[ag.id] = (grandTotals[ag.id] ?? 0) + sum;
      }

      return { menuId, menuName: acc.menuName, meals: mealRows, totals, grandTotal };
    });

  const overallTotal = Object.values(grandTotals).reduce((s, v) => s + v, 0);

  return { ageGroups, sections, grandTotals, grandTotal: overallTotal };
}

// ─── Production Summary Report ────────────────────────────────────────────────

export type SummarySchoolRow = {
  schoolName: string;
  quantities: Record<number, number>;
};

export type SummaryRouteGroup = {
  routeId: number | null;
  routeName: string;
  schools: SummarySchoolRow[];
  totals: Record<number, number>;
};

export type ProductionSummarySection = {
  menuId: number;
  menuName: string;
  foodItems: { foodId: number; foodName: string; pkUnit: string | null; tempType: string }[];
  routes: SummaryRouteGroup[];
};

export async function getProductionSummary(deliveryDate: Date): Promise<ProductionSummarySection[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);
  const deliveryMenus = await getDeliverySchoolMenus(date);
  if (deliveryMenus.length === 0) return [];

  const schoolMenuIds = deliveryMenus.map((dm) => dm.id);
  const kidCounts = await prisma.kidCount.findMany({
    where: { schoolMenuId: { in: schoolMenuIds }, count: { gt: 0 } },
  });

  const smMap = new Map(deliveryMenus.map((dm) => [dm.id, dm]));

  type RouteSchoolAcc = { schoolName: string; quantities: Map<number, number> };
  type RouteAcc = { routeName: string; schools: Map<number, RouteSchoolAcc> };
  type MenuAcc = {
    menuName: string;
    foodItems: Map<number, { foodId: number; foodName: string; pkUnit: string | null; tempType: string }>;
    routes: Map<number | null, RouteAcc>;
  };

  const menuMap = new Map<number, MenuAcc>();

  for (const kc of kidCounts) {
    const dm = smMap.get(kc.schoolMenuId)!;
    const menu = dm.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    let menuAcc = menuMap.get(menu.id);
    if (!menuAcc) {
      menuAcc = { menuName: menu.name, foodItems: new Map(), routes: new Map() };
      menuMap.set(menu.id, menuAcc);
    }

    const routeId = dm.school.routeId;
    const routeName = dm.school.route?.name ?? "No Route";

    let routeGroup = menuAcc.routes.get(routeId);
    if (!routeGroup) {
      routeGroup = { routeName, schools: new Map() };
      menuAcc.routes.set(routeId, routeGroup);
    }

    let schoolAcc = routeGroup.schools.get(kc.schoolId);
    if (!schoolAcc) {
      schoolAcc = { schoolName: dm.school.name, quantities: new Map() };
      routeGroup.schools.set(kc.schoolId, schoolAcc);
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, mealId: kc.mealId, week: cycleWeek, dayId },
      include: { foodItem: true },
    });

    for (const mi of menuItems) {
      const ss = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: mi.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!ss) continue;

      const amount = kc.count * Number(ss.servingSize);
      menuAcc.foodItems.set(mi.foodItemId, {
        foodId: mi.foodItemId,
        foodName: mi.foodItem.name,
        pkUnit: mi.foodItem.pkUnit,
        tempType: mi.foodItem.tempType,
      });
      schoolAcc.quantities.set(mi.foodItemId, (schoolAcc.quantities.get(mi.foodItemId) ?? 0) + amount);
    }
  }

  return Array.from(menuMap.entries())
    .sort(([, a], [, b]) => a.menuName.localeCompare(b.menuName))
    .map(([menuId, acc]) => {
      const foodItems = Array.from(acc.foodItems.values()).sort(
        (a, b) => a.tempType.localeCompare(b.tempType) || a.foodName.localeCompare(b.foodName)
      );

      const routes: SummaryRouteGroup[] = Array.from(acc.routes.entries())
        .sort(([, a], [, b]) => a.routeName.localeCompare(b.routeName))
        .map(([routeId, rg]) => {
          const schools: SummarySchoolRow[] = Array.from(rg.schools.values())
            .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
            .map((s) => ({ schoolName: s.schoolName, quantities: Object.fromEntries(s.quantities) }));

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
