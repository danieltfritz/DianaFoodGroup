import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId, addDays, isThursday, getBatch } from "@/lib/cycle";
import { packContainers, type PackResult, type ContainerSizeInput } from "@/lib/containers";

export type { PackResult };

export type ProductionItem = {
  foodId: number;
  foodName: string;
  tempType: string;
  totalAmount: number;
  pkUnit: string | null;
  batch: "LSD" | "TomB";
  packs: PackResult[];
  isBox: boolean;
};

export type ProductionResult = {
  lsd: ProductionItem[];
  tomb: ProductionItem[];
  box: ProductionItem[];
  all: ProductionItem[]; // lsd + tomb + box merged by foodId
};

type FoodAccumulator = {
  foodId: number;
  foodName: string;
  tempType: string;
  totalAmount: number;
  pkUnit: string | null;
  batch: "LSD" | "TomB";
  containerSizes: ContainerSizeInput[];
  containerStrategy: string;
  containerThreshold: number | null;
  isBox: boolean;
};

/** On Thursday, production covers Fri + Sat + Sun delivery. All other days: just next day. */
export function getDeliveryDatesForProductionDate(productionDate: Date): Date[] {
  if (isThursday(productionDate)) {
    return [
      addDays(productionDate, 1),
      addDays(productionDate, 2),
      addDays(productionDate, 3),
    ];
  }
  return [addDays(productionDate, 1)];
}

function accToItem(acc: FoodAccumulator): ProductionItem {
  return {
    foodId: acc.foodId,
    foodName: acc.foodName,
    tempType: acc.tempType,
    totalAmount: acc.totalAmount,
    pkUnit: acc.pkUnit,
    batch: acc.batch,
    isBox: acc.isBox,
    packs: acc.isBox
      ? []
      : packContainers(acc.totalAmount, acc.containerSizes, acc.containerStrategy, acc.containerThreshold),
  };
}

export async function calculateProduction(deliveryDate: Date): Promise<ProductionResult> {
  const dayId = getDayId(deliveryDate);

  const [closedSchoolIds, meals] = await Promise.all([
    prisma.schoolClosing
      .findMany({
        where: { startDate: { lte: deliveryDate }, endDate: { gte: deliveryDate } },
        select: { schoolId: true },
      })
      .then((r) => r.map((c) => c.schoolId)),
    prisma.meal.findMany({ select: { id: true, name: true } }),
  ]);

  const mealNameMap = new Map(meals.map((m) => [m.id, m.name]));

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      date: deliveryDate,
      schoolId: { notIn: closedSchoolIds.length > 0 ? closedSchoolIds : [-1] },
      count: { gt: 0 },
    },
    include: {
      schoolMenu: { include: { menu: true } },
    },
  });

  if (kidCounts.length === 0) return { lsd: [], tomb: [], box: [], all: [] };

  const lsdTotals = new Map<number, FoodAccumulator>();
  const tombTotals = new Map<number, FoodAccumulator>();
  const boxTotals = new Map<number, FoodAccumulator>();

  for (const kc of kidCounts) {
    const menu = kc.schoolMenu.menu;
    const cycleWeek = getCycleWeek(deliveryDate, menu.effectiveDate, menu.cycleWeeks);
    const mealName = mealNameMap.get(kc.mealId) ?? "";
    const batch = getBatch(mealName, menu.delaySnack);
    const isBox = menu.isBoxMenu;
    const totals = isBox ? boxTotals : batch === "LSD" ? lsdTotals : tombTotals;

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, mealId: kc.mealId, week: cycleWeek, dayId },
      include: {
        foodItem: {
          include: {
            container: {
              include: { sizes: { orderBy: { size: "desc" } } },
            },
          },
        },
      },
    });

    for (const item of menuItems) {
      const servingSize = await prisma.servingSize.findUnique({
        where: {
          mealId_foodItemId_ageGroupId: {
            mealId: kc.mealId,
            foodItemId: item.foodItemId,
            ageGroupId: kc.ageGroupId,
          },
        },
      });
      if (!servingSize) continue;

      const amount = kc.count * Number(servingSize.servingSize);
      const existing = totals.get(item.foodItemId);

      if (existing) {
        existing.totalAmount += amount;
      } else {
        const containerSizes: ContainerSizeInput[] =
          item.foodItem.container?.sizes.map((s) => ({
            id: s.id,
            name: s.name,
            abbreviation: s.abbreviation,
            size: Number(s.size),
          })) ?? [];

        totals.set(item.foodItemId, {
          foodId: item.foodItemId,
          foodName: item.foodItem.name,
          tempType: item.foodItem.tempType,
          totalAmount: amount,
          pkUnit: item.foodItem.pkUnit,
          batch,
          isBox,
          containerSizes,
          containerStrategy: item.foodItem.containerStrategy,
          containerThreshold: item.foodItem.containerThreshold
            ? Number(item.foodItem.containerThreshold)
            : null,
        });
      }
    }
  }

  const sortItems = (items: ProductionItem[]) =>
    items.sort((a, b) =>
      a.tempType !== b.tempType
        ? a.tempType.localeCompare(b.tempType)
        : a.foodName.localeCompare(b.foodName)
    );

  const lsd = sortItems(Array.from(lsdTotals.values()).map(accToItem));
  const tomb = sortItems(Array.from(tombTotals.values()).map(accToItem));
  const box = sortItems(Array.from(boxTotals.values()).map(accToItem));

  // Merge lsd + tomb + box by foodId for consumers needing the full undifferentiated list
  const allMap = new Map<number, ProductionItem>();
  for (const item of [...lsd, ...tomb, ...box]) {
    const ex = allMap.get(item.foodId);
    if (ex) {
      ex.totalAmount += item.totalAmount;
    } else {
      allMap.set(item.foodId, { ...item });
    }
  }
  // Re-run packs on merged totals for non-box items
  for (const item of allMap.values()) {
    if (item.isBox) continue;
    const acc = lsdTotals.get(item.foodId) ?? tombTotals.get(item.foodId);
    if (acc) {
      item.packs = packContainers(
        item.totalAmount,
        acc.containerSizes,
        acc.containerStrategy,
        acc.containerThreshold
      );
    }
  }
  const all = sortItems(Array.from(allMap.values()));

  return { lsd, tomb, box, all };
}
