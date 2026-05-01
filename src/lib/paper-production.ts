import { prisma } from "@/lib/db";
import { getCycleWeek, getDayId, schoolDeliversOn, addDays } from "@/lib/cycle";

export type PaperSchoolTotal = {
  schoolId: number;
  schoolName: string;
  items: PaperLineItem[];
};

export type PaperLineItem = {
  paperId: number;
  paperName: string;
  paperSizeId: number | null;
  paperSizeName: string | null;
  totalQty: number;
};

export type PaperRunPreview = {
  schoolTotals: PaperSchoolTotal[];
  paperItems: { id: number; name: string }[];
  paperSizes: { id: number; name: string | null }[];
};

function eachDate(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Aggregate key: "paperId-paperSizeId"
function key(paperId: number, paperSizeId: number | null) {
  return `${paperId}-${paperSizeId ?? 0}`;
}

export async function calculatePaperProduction(
  schoolIds: number[],
  startDate: Date,
  endDate: Date
): Promise<PaperRunPreview> {
  const dates = eachDate(startDate, endDate);

  // Preload everything we need
  const [allSchools, closings, allKidCounts, paperItems, paperSizes] = await Promise.all([
    prisma.school.findMany({
      where: { id: { in: schoolIds }, active: true },
      include: {
        schoolMenus: {
          where: {
            startDate: { lte: endDate },
            OR: [{ endDate: null }, { endDate: { gte: startDate } }],
          },
          include: { menu: true },
          orderBy: { startDate: "desc" },
        },
      },
    }),
    prisma.schoolClosing.findMany({
      where: {
        schoolId: { in: schoolIds },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    }),
    prisma.kidCount.findMany({
      where: {
        schoolId: { in: schoolIds },
        count: { gt: 0 },
      },
    }),
    prisma.paperItem.findMany({ orderBy: { name: "asc" } }),
    prisma.paperSize.findMany({ orderBy: { id: "asc" } }),
  ]);

  const closedSet = new Set(
    closings.map((c) => {
      const days: string[] = [];
      const cur = new Date(c.startDate);
      while (cur <= c.endDate) {
        days.push(`${c.schoolId}-${cur.toISOString().split("T")[0]}`);
        cur.setDate(cur.getDate() + 1);
      }
      return days;
    }).flat()
  );

  const paperItemMap = new Map(paperItems.map((p) => [p.id, p.name]));
  const paperSizeMap = new Map(paperSizes.map((s) => [s.id, s.name]));

  // schoolId → Map<key, qty>
  const schoolTotalsMap = new Map<number, Map<string, { paperId: number; paperSizeId: number | null; qty: number }>>();

  for (const school of allSchools) {
    const totals = new Map<string, { paperId: number; paperSizeId: number | null; qty: number }>();
    schoolTotalsMap.set(school.id, totals);

    for (const date of dates) {
      const dateStr = date.toISOString().split("T")[0];
      if (closedSet.has(`${school.id}-${dateStr}`)) continue;
      if (!schoolDeliversOn(school, date)) continue;

      // Find active menu for this date
      const schoolMenu = school.schoolMenus.find(
        (sm) => sm.startDate <= date && (sm.endDate == null || sm.endDate >= date)
      );
      if (!schoolMenu) continue;

      const menu = schoolMenu.menu;
      const cycleWeek = getCycleWeek(date, menu.effectiveDate, menu.cycleWeeks);
      const dayId = getDayId(date);

      // Kid counts for this school's active menu (static per menu, not per date)
      const dayKidCounts = allKidCounts.filter((kc) => kc.schoolMenuId === schoolMenu.id);
      if (dayKidCounts.length === 0) continue;

      // Preload menu items for this day
      const menuItems = await prisma.menuItem.findMany({
        where: { menuId: menu.id, week: cycleWeek, dayId },
        select: { foodItemId: true, mealId: true },
      });

      // Preload overrides for this school
      const overrides = await prisma.paperOverride.findMany({
        where: { schoolId: school.id },
      });
      const overrideMap = new Map(
        overrides.map((o) => [`${o.mealId}-${o.ageGroupId}-${o.paperId}-${o.paperSizeId ?? 0}`, o])
      );

      for (const kc of dayKidCounts) {
        const { mealId, ageGroupId, count } = kc;

        // 1. Menu paper items for this week/day/meal/ageGroup
        const menuPaperItems = await prisma.menuPaperItem.findMany({
          where: {
            menuId: menu.id,
            week: cycleWeek,
            dayId,
            mealId,
            ageGroupId,
            OR: [{ schoolId: null }, { schoolId: school.id }],
          },
        });

        // 2. Food paper items for each food on this day's menu for this meal
        const mealFoodIds = menuItems.filter((mi) => mi.mealId === mealId).map((mi) => mi.foodItemId);
        const foodPaperItems = mealFoodIds.length > 0
          ? await prisma.foodPaperItem.findMany({
              where: {
                foodId: { in: mealFoodIds },
                mealId,
                ageGroupId,
                OR: [{ schoolId: null }, { schoolId: school.id }],
              },
            })
          : [];

        // Combine: dedupe by paperId+paperSizeId (school-specific wins over global)
        type PaperEntry = { paperId: number; paperSizeId: number | null; qty: number; isAlways: boolean };
        const combined = new Map<string, PaperEntry>();

        for (const mpi of menuPaperItems) {
          const k = key(mpi.paperId, mpi.paperSizeId);
          const existing = combined.get(k);
          // School-specific overrides global
          if (!existing || (mpi.schoolId !== null && existing.paperId === mpi.paperId)) {
            combined.set(k, { paperId: mpi.paperId, paperSizeId: mpi.paperSizeId, qty: mpi.paperQty, isAlways: mpi.isAlways });
          }
        }
        for (const fpi of foodPaperItems) {
          const k = key(fpi.paperId, fpi.paperSizeId);
          const existing = combined.get(k);
          if (!existing || (fpi.schoolId !== null && existing.paperId === fpi.paperId)) {
            combined.set(k, { paperId: fpi.paperId, paperSizeId: fpi.paperSizeId, qty: 0, isAlways: fpi.isAlways });
          }
        }

        // 3. Apply overrides
        const overridden = new Map<string, PaperEntry>();
        for (const [k, entry] of combined) {
          const oKey = `${mealId}-${ageGroupId}-${entry.paperId}-${entry.paperSizeId ?? 0}`;
          const override = overrideMap.get(oKey);
          if (override) {
            if (override.orPaperId == null) continue; // removal override
            overridden.set(key(override.orPaperId, override.orPaperSizeId), {
              paperId: override.orPaperId,
              paperSizeId: override.orPaperSizeId,
              qty: entry.qty,
              isAlways: entry.isAlways,
            });
          } else {
            overridden.set(k, entry);
          }
        }

        // 4. Multiply by kid count
        for (const entry of overridden.values()) {
          const qty = entry.isAlways ? 1 : Math.max(entry.qty, 1) * count;
          const k = key(entry.paperId, entry.paperSizeId);
          const existing = totals.get(k);
          if (existing) {
            existing.qty += qty;
          } else {
            totals.set(k, { paperId: entry.paperId, paperSizeId: entry.paperSizeId, qty });
          }
        }
      }
    }
  }

  const schoolTotals: PaperSchoolTotal[] = allSchools
    .map((school) => {
      const totals = schoolTotalsMap.get(school.id) ?? new Map();
      const items: PaperLineItem[] = Array.from(totals.values())
        .filter((t) => t.qty > 0)
        .sort((a, b) => {
          const na = paperItemMap.get(a.paperId) ?? "";
          const nb = paperItemMap.get(b.paperId) ?? "";
          return na.localeCompare(nb) || (a.paperSizeId ?? 0) - (b.paperSizeId ?? 0);
        })
        .map((t) => ({
          paperId: t.paperId,
          paperName: paperItemMap.get(t.paperId) ?? `Paper#${t.paperId}`,
          paperSizeId: t.paperSizeId,
          paperSizeName: t.paperSizeId ? (paperSizeMap.get(t.paperSizeId) ?? null) : null,
          totalQty: t.qty,
        }));
      return { schoolId: school.id, schoolName: school.name, items };
    })
    .filter((s) => s.items.length > 0)
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName));

  return { schoolTotals, paperItems, paperSizes };
}
