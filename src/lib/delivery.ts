import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId, schoolDeliversOn, getBatch } from "@/lib/cycle";
import { packContainers, formatPacks, type PackResult, type ContainerSizeInput } from "@/lib/containers";

export type { PackResult };

export type DeliveryFoodLine = {
  foodId: number;
  foodName: string;
  mealId: number;
  mealName: string;
  batch: "LSD" | "TomB";
  totalAmount: number;
  pkUnit: string | null;
  packs: PackResult[];
  packsLabel: string;
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
  isBox: boolean;
  totalKids: number;
  lines: DeliveryFoodLine[];
};

export async function getDeliveryData(deliveryDate: Date): Promise<DeliverySchool[]> {
  const dayId = getDayId(deliveryDate);

  const [allSchools, kidCounts, closings] = await Promise.all([
    prisma.school.findMany({
      where: { active: true },
      include: {
        route: true,
        schoolMenus: {
          where: {
            startDate: { lte: deliveryDate },
            OR: [{ endDate: null }, { endDate: { gte: deliveryDate } }],
          },
          include: { menu: true },
          take: 1,
          orderBy: { startDate: "desc" },
        },
      },
      orderBy: [{ route: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.kidCount.findMany({
      where: { date: deliveryDate, count: { gt: 0 } },
      include: { meal: true, ageGroup: true },
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: deliveryDate }, endDate: { gte: deliveryDate } },
    }),
  ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));
  const activeSchools = allSchools.filter(
    (s) => s.schoolMenus.length > 0 && schoolDeliversOn(s, deliveryDate)
  );

  const results: DeliverySchool[] = [];

  for (const school of activeSchools) {
    const schoolMenu = school.schoolMenus[0];
    const menu = schoolMenu.menu;
    const cycleWeek = getCycleWeek(deliveryDate, menu.effectiveDate, menu.cycleWeeks);

    const schoolKidCounts = kidCounts.filter((kc) => kc.schoolId === school.id);
    const totalKids = schoolKidCounts.reduce((s, kc) => s + kc.count, 0);

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId: menu.id, week: cycleWeek, dayId },
      include: {
        foodItem: {
          include: {
            container: { include: { sizes: { orderBy: { size: "desc" } } } },
          },
        },
        meal: true,
      },
    });

    // Accumulate amount per food × meal, then compute packs after
    type LineAcc = {
      foodId: number;
      foodName: string;
      mealId: number;
      mealName: string;
      batch: "LSD" | "TomB";
      totalAmount: number;
      pkUnit: string | null;
      containerSizes: ContainerSizeInput[];
      containerStrategy: string;
      containerThreshold: number | null;
    };

    const lineMap = new Map<string, LineAcc>();

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
        const containerSizes: ContainerSizeInput[] =
          mi.foodItem.container?.sizes.map((s) => ({
            id: s.id,
            name: s.name,
            abbreviation: s.abbreviation,
            size: Number(s.size),
          })) ?? [];

        lineMap.set(key, {
          foodId: mi.foodItemId,
          foodName: mi.foodItem.name,
          mealId: mi.mealId,
          mealName: mi.meal.name,
          batch: getBatch(mi.meal.name, menu.delaySnack),
          totalAmount,
          pkUnit: mi.foodItem.pkUnit,
          containerSizes,
          containerStrategy: mi.foodItem.containerStrategy,
          containerThreshold: mi.foodItem.containerThreshold
            ? Number(mi.foodItem.containerThreshold)
            : null,
        });
      }
    }

    const isBox = menu.isBoxMenu;

    const lines: DeliveryFoodLine[] = Array.from(lineMap.values())
      .map((acc) => {
        const packs = isBox
          ? []
          : packContainers(acc.totalAmount, acc.containerSizes, acc.containerStrategy, acc.containerThreshold);
        return {
          foodId: acc.foodId,
          foodName: acc.foodName,
          mealId: acc.mealId,
          mealName: acc.mealName,
          batch: acc.batch,
          totalAmount: acc.totalAmount,
          pkUnit: acc.pkUnit,
          packs,
          packsLabel: isBox ? "—" : formatPacks(packs),
        };
      })
      .sort(
        (a, b) =>
          a.mealName.localeCompare(b.mealName) ||
          a.foodName.localeCompare(b.foodName)
      );

    results.push({
      schoolId: school.id,
      schoolName: school.name,
      address: school.address,
      city: school.city,
      state: school.state,
      route: school.route?.name ?? null,
      routeId: school.routeId,
      isClosed: closedIds.has(school.id),
      isBox,
      totalKids,
      lines,
    });
  }

  return results;
}
