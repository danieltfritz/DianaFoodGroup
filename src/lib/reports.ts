import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId } from "@/lib/cycle";

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
  const date = deliveryDate;
  const [kidCounts, closings, meals, ageGroups] = await Promise.all([
    prisma.kidCount.findMany({
      where: { date, count: { gt: 0 } },
      include: {
        school: { include: { route: true } },
        meal: true,
        ageGroup: true,
      },
      orderBy: [{ school: { name: "asc" } }, { meal: { id: "asc" } }],
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
  ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));

  // Group by school
  const schoolMap = new Map<number, SchoolSummaryRow>();

  for (const kc of kidCounts) {
    let row = schoolMap.get(kc.schoolId);
    if (!row) {
      row = {
        schoolId: kc.schoolId,
        schoolName: kc.school.name,
        route: kc.school.route?.name ?? null,
        isClosed: closedIds.has(kc.schoolId),
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

  const closedIds = (
    await prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    })
  ).map((c) => c.schoolId);

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      date,
      schoolId: { notIn: closedIds.length > 0 ? closedIds : [-1] },
      count: { gt: 0 },
    },
    include: { schoolMenu: { include: { menu: true } } },
  });

  if (kidCounts.length === 0) return [];

  const foodTotals = new Map<
    number,
    { amount: number; food: { pkSize: number | null; pkUnit: string | null; name: string; tempType: string; container: { name: string; units: string | null } | null } }
  >();

  for (const kc of kidCounts) {
    const menu = kc.schoolMenu.menu;
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
  rawAmount: number;       // oz from kid counts × serving sizes
  pkSize: number | null;   // oz per container unit
  pkUnit: string | null;
  orderedUnits: number | null; // containers to order after overage + rounding
  orderedAmount: number;   // oz after overage, rounded up to nearest pkSize
};

export type MilkSchoolRow = {
  schoolId: number;
  schoolName: string;
  route: string | null;
  milkTier: string;
  overagePct: number; // e.g. 50 for 50%
  items: MilkItem[];
};

export async function getMilkReport(deliveryDate: Date): Promise<MilkSchoolRow[]> {
  const date = deliveryDate;
  const dayId = getDayId(date);

  const closedIds = (
    await prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    })
  ).map((c) => c.schoolId);

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      date,
      schoolId: { notIn: closedIds.length > 0 ? closedIds : [-1] },
      count: { gt: 0 },
    },
    include: {
      school: { include: { route: true } },
      schoolMenu: { include: { menu: true } },
      meal: true,
    },
  });

  if (kidCounts.length === 0) return [];

  type SchoolAcc = {
    schoolName: string;
    route: string | null;
    milkTier: string;
    items: Map<string, { foodId: number; foodName: string; mealName: string; rawAmount: number; pkSize: number | null; pkUnit: string | null }>;
  };

  const schoolMap = new Map<number, SchoolAcc>();

  for (const kc of kidCounts) {
    const menu = kc.schoolMenu.menu;
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
          schoolName: kc.school.name,
          route: kc.school.route?.name ?? null,
          milkTier: kc.school.milkTier,
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
          mealName: kc.meal.name,
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

      const milkItems: MilkItem[] = Array.from(items.values())
        .sort((a, b) => a.mealName.localeCompare(b.mealName) || a.foodName.localeCompare(b.foodName))
        .map((item) => {
          const afterOverage = item.rawAmount * multiplier;
          const orderedUnits = item.pkSize
            ? Math.ceil(afterOverage / item.pkSize)
            : null;
          const orderedAmount = orderedUnits && item.pkSize
            ? orderedUnits * item.pkSize
            : Math.ceil(afterOverage);
          return { ...item, orderedUnits, orderedAmount };
        });

      return { schoolId, schoolName, route, milkTier, overagePct, items: milkItems };
    })
    .sort((a, b) => (a.route ?? "zzz").localeCompare(b.route ?? "zzz") || a.schoolName.localeCompare(b.schoolName));
}
