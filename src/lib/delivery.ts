import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId, schoolDeliversOn } from "@/lib/cycle";

export type DeliveryFoodLine = {
  foodId: number;
  foodName: string;
  mealId: number;
  mealName: string;
  totalAmount: number;
  pkUnit: string | null;
  pkSize: number | null;
  packsNeeded: number | null;
};

export type DeliverySchool = {
  schoolId: number;
  schoolName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  route: string | null;
  routeId: number | null;
  isClosed: boolean;
  totalKids: number;
  lines: DeliveryFoodLine[];
};

export async function getDeliveryData(date: Date): Promise<DeliverySchool[]> {
  const dayId = getDayId(date);

  const [allSchools, kidCounts, closings] = await Promise.all([
    prisma.school.findMany({
      where: { active: true },
      include: {
        route: true,
        schoolMenus: {
          where: {
            startDate: { lte: date },
            OR: [{ endDate: null }, { endDate: { gte: date } }],
          },
          include: { menu: true },
          take: 1,
          orderBy: { startDate: "desc" },
        },
      },
      orderBy: [{ route: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.kidCount.findMany({
      where: { date, count: { gt: 0 } },
      include: { meal: true, ageGroup: true },
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    }),
  ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));
  const activeSchools = allSchools.filter(
    (s) => s.schoolMenus.length > 0 && schoolDeliversOn(s, date)
  );

  const results: DeliverySchool[] = [];

  for (const school of activeSchools) {
    const schoolMenu = school.schoolMenus[0];
    const menu = schoolMenu.menu;
    const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);

    const schoolKidCounts = kidCounts.filter((kc) => kc.schoolId === school.id);
    const totalKids = schoolKidCounts.reduce((s, kc) => s + kc.count, 0);

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, week: cycleWeek, dayId },
      include: { foodItem: true, meal: true },
    });

    // Aggregate: food × meal → total amount across all age groups
    const lineMap = new Map<string, DeliveryFoodLine>();

    for (const mi of menuItems) {
      const mealCounts = schoolKidCounts.filter((kc) => kc.mealId === mi.mealId);
      if (mealCounts.length === 0) continue;

      let totalAmount = 0;
      for (const kc of mealCounts) {
        const ss = await prisma.servingSize.findUnique({
          where: {
            mealId_foodItemId_ageGroupId: {
              mealId: mi.mealId,
              foodItemId: mi.foodItemId,
              ageGroupId: kc.ageGroupId,
            },
          },
        });
        if (ss) totalAmount += kc.count * Number(ss.servingSize);
      }

      if (totalAmount === 0) continue;

      const key = `${mi.foodItemId}-${mi.mealId}`;
      const existing = lineMap.get(key);
      if (existing) {
        existing.totalAmount += totalAmount;
      } else {
        const pkSize = mi.foodItem.pkSize;
        lineMap.set(key, {
          foodId: mi.foodItemId,
          foodName: mi.foodItem.name,
          mealId: mi.mealId,
          mealName: mi.meal.name,
          totalAmount,
          pkUnit: mi.foodItem.pkUnit,
          pkSize,
          packsNeeded: pkSize ? Math.ceil(totalAmount / pkSize) : null,
        });
      }
    }

    results.push({
      schoolId: school.id,
      schoolName: school.name,
      address: school.address,
      city: school.city,
      state: school.state,
      route: school.route?.name ?? null,
      routeId: school.routeId,
      isClosed: closedIds.has(school.id),
      totalKids,
      lines: Array.from(lineMap.values()).sort((a, b) =>
        a.mealName.localeCompare(b.mealName) || a.foodName.localeCompare(b.foodName)
      ),
    });
  }

  return results;
}
