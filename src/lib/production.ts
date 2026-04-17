import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId } from "@/lib/cycle";

export type ProductionItem = {
  foodId: number;
  foodName: string;
  tempType: string;
  totalAmount: number;
  pkSize: number | null;
  pkUnit: string | null;
};

export async function calculateProduction(date: Date): Promise<ProductionItem[]> {
  const dayId = getDayId(date);

  // Get all kid counts for this date (excluding closed schools)
  const closedSchoolIds = (
    await prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    })
  ).map((c) => c.schoolId);

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      date,
      schoolId: { notIn: closedSchoolIds.length > 0 ? closedSchoolIds : [-1] },
      count: { gt: 0 },
    },
    include: {
      schoolMenu: { include: { menu: true } },
    },
  });

  if (kidCounts.length === 0) return [];

  // For each kid count, find the menu items for that school/date/meal
  const foodTotals = new Map<number, ProductionItem>();

  for (const kc of kidCounts) {
    const menu = kc.schoolMenu.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const menuItems = await prisma.menuItem.findMany({
      where: {
        menuId: menu.id,
        mealId: kc.mealId,
        week: cycleWeek,
        dayId,
      },
      include: {
        foodItem: true,
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
      const existing = foodTotals.get(item.foodItemId);

      if (existing) {
        existing.totalAmount += amount;
      } else {
        foodTotals.set(item.foodItemId, {
          foodId: item.foodItemId,
          foodName: item.foodItem.name,
          tempType: item.foodItem.tempType,
          totalAmount: amount,
          pkSize: item.foodItem.pkSize,
          pkUnit: item.foodItem.pkUnit,
        });
      }
    }
  }

  return Array.from(foodTotals.values()).sort((a, b) => {
    if (a.tempType !== b.tempType) return a.tempType.localeCompare(b.tempType);
    return a.foodName.localeCompare(b.foodName);
  });
}
