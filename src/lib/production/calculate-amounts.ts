import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function calculateAmounts(productionId: number): Promise<void> {
  const productionMenus = await prisma.productionMenu.findMany({
    where: { productionId },
    include: { menu: true },
  });

  if (productionMenus.length === 0) return;

  const schoolMenuIds = [...new Set(productionMenus.map((pm) => pm.schoolMenuId))];
  const menuIds = [...new Set(productionMenus.map((pm) => pm.menuId))];

  // All menu items for all menus in this production run
  const menuItems = await prisma.menuItem.findMany({
    where: { menuId: { in: menuIds } },
    include: { foodItem: true },
  });

  const foodItemIds = [...new Set(menuItems.map((mi) => mi.foodItemId))];

  const [servingSizes, kidCounts, milkCounts] = await Promise.all([
    prisma.servingSize.findMany({ where: { foodItemId: { in: foodItemIds } } }),
    prisma.kidCount.findMany({ where: { schoolMenuId: { in: schoolMenuIds } } }),
    prisma.milkCount.findMany({ where: { schoolMenuId: { in: schoolMenuIds } } }),
  ]);

  // Lookup maps for O(1) access
  const servingSizeMap = new Map<string, Decimal>();
  for (const ss of servingSizes) {
    servingSizeMap.set(`${ss.foodItemId}-${ss.mealId}-${ss.ageGroupId}`, ss.servingSize);
  }

  // kidCount per schoolMenu/meal/ageGroup
  const kidCountMap = new Map<string, number>();
  for (const kc of kidCounts) {
    kidCountMap.set(`${kc.schoolMenuId}-${kc.mealId}-${kc.ageGroupId}`, kc.count);
  }

  // milkCounts grouped by schoolMenu/meal/ageGroup → array of {milkTypeId, count}
  const milkCountMap = new Map<string, { milkTypeId: number; count: number }[]>();
  for (const mc of milkCounts) {
    const key = `${mc.schoolMenuId}-${mc.mealId}-${mc.ageGroupId}`;
    const existing = milkCountMap.get(key) ?? [];
    existing.push({ milkTypeId: mc.milkTypeId, count: mc.count });
    milkCountMap.set(key, existing);
  }

  // Menu items grouped by menuId-week-dayId for fast lookup
  const menuItemsBySlot = new Map<string, typeof menuItems>();
  for (const mi of menuItems) {
    const key = `${mi.menuId}-${mi.week}-${mi.dayId}`;
    const existing = menuItemsBySlot.get(key) ?? [];
    existing.push(mi);
    menuItemsBySlot.set(key, existing);
  }

  // All ageGroupIds that appear in serving sizes (our universe of age groups)
  const ageGroupIds = [...new Set(servingSizes.map((ss) => ss.ageGroupId))];

  // Accumulators
  const amtKey = (productionMenuId: number, foodItemId: number, mealId: number) =>
    `${productionMenuId}-${foodItemId}-${mealId}`;
  const milkKey = (schoolMenuId: number, foodItemId: number, milkTypeId: number) =>
    `${schoolMenuId}-${foodItemId}-${milkTypeId}`;

  const amtTotals = new Map<string, { productionMenuId: number; foodItemId: number; mealId: number; total: Decimal }>();
  const milkTotals = new Map<string, { schoolMenuId: number; schoolId: number; foodItemId: number; milkTypeId: number; total: Decimal }>();

  for (const pm of productionMenus) {
    const items = menuItemsBySlot.get(`${pm.menuId}-${pm.week}-${pm.dayId}`) ?? [];

    // Filter items to the correct meal batch for this ProductionMenu
    const relevantItems = items.filter((mi) => {
      if (pm.isLSD) {
        return mi.mealId === 2 || mi.mealId === 4 || (mi.mealId === 3 && !pm.menu.delaySnack);
      }
      if (pm.isTomB) {
        return mi.mealId === 1 || (mi.mealId === 3 && pm.menu.delaySnack);
      }
      return false;
    });

    for (const mi of relevantItems) {
      if (mi.foodItem.isMilk) {
        // ── Milk path ──────────────────────────────────────────────────
        for (const ageGroupId of ageGroupIds) {
          const ss = servingSizeMap.get(`${mi.foodItemId}-${mi.mealId}-${ageGroupId}`);
          if (!ss || ss.equals(0)) continue;

          const milkEntries = milkCountMap.get(`${pm.schoolMenuId}-${mi.mealId}-${ageGroupId}`) ?? [];
          for (const { milkTypeId, count } of milkEntries) {
            if (count === 0) continue;
            const foodAmt = ss.mul(count);
            if (foodAmt.equals(0)) continue;

            const key = milkKey(pm.schoolMenuId, mi.foodItemId, milkTypeId);
            const existing = milkTotals.get(key);
            if (existing) {
              existing.total = existing.total.add(foodAmt);
            } else {
              milkTotals.set(key, {
                schoolMenuId: pm.schoolMenuId,
                schoolId: pm.schoolId,
                foodItemId: mi.foodItemId,
                milkTypeId,
                total: foodAmt,
              });
            }
          }
        }
      } else {
        // ── Non-milk path ──────────────────────────────────────────────
        for (const ageGroupId of ageGroupIds) {
          const ss = servingSizeMap.get(`${mi.foodItemId}-${mi.mealId}-${ageGroupId}`);
          if (!ss || ss.equals(0)) continue;

          const kidCount = kidCountMap.get(`${pm.schoolMenuId}-${mi.mealId}-${ageGroupId}`) ?? 0;
          if (kidCount === 0) continue;

          const foodAmt = ss.mul(kidCount);
          if (foodAmt.equals(0)) continue;

          const key = amtKey(pm.id, mi.foodItemId, mi.mealId);
          const existing = amtTotals.get(key);
          if (existing) {
            existing.total = existing.total.add(foodAmt);
          } else {
            amtTotals.set(key, {
              productionMenuId: pm.id,
              foodItemId: mi.foodItemId,
              mealId: mi.mealId,
              total: foodAmt,
            });
          }
        }
      }
    }
  }

  // Bulk insert ProductionAmt
  const amtRows = [...amtTotals.values()].map((r) => ({
    productionMenuId: r.productionMenuId,
    foodItemId: r.foodItemId,
    mealId: r.mealId,
    foodAmt: r.total,
  }));

  // Bulk insert ProductionMilk
  const milkRows = [...milkTotals.values()].map((r) => ({
    productionId,
    schoolMenuId: r.schoolMenuId,
    schoolId: r.schoolId,
    foodItemId: r.foodItemId,
    milkTypeId: r.milkTypeId,
    foodAmt: r.total,
  }));

  await Promise.all([
    amtRows.length > 0
      ? prisma.productionAmt.createMany({ data: amtRows })
      : Promise.resolve(),
    milkRows.length > 0
      ? prisma.productionMilk.createMany({ data: milkRows })
      : Promise.resolve(),
  ]);
}
