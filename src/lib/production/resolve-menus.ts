import { prisma } from "@/lib/db";
import { getMenuDay, getMenuWeek, ProductionDaySpec } from "./serving-dates";

// LSD batch: Lunch(2), Snack-not-delayed(3 if delaySnack=false), Dinner/Snack(4)
// TomB batch: Breakfast(1), Snack-delayed(3 if delaySnack=true)

function lsdMealIds(delaySnack: boolean): number[] {
  return delaySnack ? [2, 4] : [2, 3, 4];
}

function tomBMealIds(delaySnack: boolean): number[] {
  return delaySnack ? [1, 3] : [1];
}

function schoolDeliversOnDay(
  school: {
    deliveryMon: boolean; deliveryTue: boolean; deliveryWed: boolean;
    deliveryThu: boolean; deliveryFri: boolean; deliverySat: boolean; deliverySun: boolean;
  },
  dayId: number
): boolean {
  const flags = [
    school.deliveryMon, school.deliveryTue, school.deliveryWed,
    school.deliveryThu, school.deliveryFri, school.deliverySat, school.deliverySun,
  ];
  return flags[dayId - 1] ?? false;
}

async function resolveMenuBatch(
  productionId: number,
  servingDate: Date,
  dayId: number,
  isLSD: boolean,
  isTomB: boolean
): Promise<number> {
  const schools = await prisma.school.findMany({
    where: { active: true },
    include: {
      schoolMenus: {
        where: {
          startDate: { lte: servingDate },
          OR: [{ endDate: null }, { endDate: { gte: servingDate } }],
        },
        include: { menu: true },
      },
      schoolClosings: {
        where: {
          startDate: { lte: servingDate },
          endDate: { gte: servingDate },
        },
      },
    },
  });

  const allSchoolMenuIds = schools.flatMap((s) => s.schoolMenus.map((sm) => sm.id));

  const [kidCountSums, menuItems] = await Promise.all([
    prisma.kidCount.groupBy({
      by: ["schoolMenuId"],
      where: { schoolMenuId: { in: allSchoolMenuIds } },
      _sum: { count: true },
    }),
    prisma.menuItem.findMany({
      where: {
        menuId: { in: [...new Set(schools.flatMap((s) => s.schoolMenus.map((sm) => sm.menuId)))] },
        dayId,
      },
    }),
  ]);

  const kidTotals = new Map(kidCountSums.map((k) => [k.schoolMenuId, k._sum.count ?? 0]));
  // Set of "menuId-week-mealId" for O(1) lookup
  const menuItemSet = new Set(menuItems.map((mi) => `${mi.menuId}-${mi.week}-${mi.mealId}`));

  const rows: {
    productionId: number;
    schoolId: number;
    menuId: number;
    schoolMenuId: number;
    isBoxMenu: boolean;
    week: number;
    dayId: number;
    isLSD: boolean;
    isTomB: boolean;
  }[] = [];

  for (const school of schools) {
    if (school.schoolClosings.length > 0) continue;
    if (!schoolDeliversOnDay(school, dayId)) continue;

    const regular = school.schoolMenus.filter((sm) => !sm.menu.isBoxMenu);
    const box = school.schoolMenus.filter((sm) => sm.menu.isBoxMenu);

    for (const group of [regular, box]) {
      if (group.length === 0) continue;

      // Override menu (has endDate) takes priority over permanent menu
      const best = group.find((sm) => sm.endDate !== null) ?? group[0];
      const week = getMenuWeek(best.menu.effectiveDate, servingDate, best.menu.cycleWeeks);
      const mealIds = isLSD ? lsdMealIds(best.menu.delaySnack) : tomBMealIds(best.menu.delaySnack);

      const hasItems = mealIds.some((id) => menuItemSet.has(`${best.menuId}-${week}-${id}`));
      if (!hasItems) continue;

      if ((kidTotals.get(best.id) ?? 0) === 0) continue;

      rows.push({
        productionId,
        schoolId: school.id,
        menuId: best.menuId,
        schoolMenuId: best.id,
        isBoxMenu: best.menu.isBoxMenu,
        week,
        dayId,
        isLSD,
        isTomB,
      });
    }
  }

  if (rows.length > 0) {
    await prisma.productionMenu.createMany({ data: rows });
  }

  return rows.length;
}

export async function resolveProductionMenus(
  productionId: number,
  spec: ProductionDaySpec
): Promise<number> {
  const lsdDayId = getMenuDay(spec.servingDateLSD);
  const tomBDayId = getMenuDay(spec.servingDateB);

  const [lsd, tomB] = await Promise.all([
    resolveMenuBatch(productionId, spec.servingDateLSD, lsdDayId, true, false),
    resolveMenuBatch(productionId, spec.servingDateB, tomBDayId, false, true),
  ]);

  return lsd + tomB;
}
