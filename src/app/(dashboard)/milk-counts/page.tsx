import { prisma } from "@/lib/db";
import { MilkCountGrid } from "@/components/kid-counts/milk-count-grid";

export default async function MilkCountsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allSchools, meals, ageGroups, milkTypes] = await Promise.all([
    prisma.school.findMany({
      where: { active: true },
      include: {
        schoolMenus: {
          where: {
            OR: [{ endDate: null }, { endDate: { gte: today } }],
          },
          include: { menu: true },
          orderBy: { startDate: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.milkType.findMany({ orderBy: { id: "asc" } }),
  ]);

  const schoolsWithMenu = allSchools.filter((s) => s.schoolMenus.length > 0);
  const allSchoolMenuIds = schoolsWithMenu.flatMap((s) => s.schoolMenus.map((sm) => sm.id));

  const existingMilkCounts = allSchoolMenuIds.length > 0
    ? await prisma.milkCount.findMany({ where: { schoolMenuId: { in: allSchoolMenuIds } } })
    : [];

  const rows = schoolsWithMenu.flatMap((s) =>
    s.schoolMenus.map((sm) => {
      const milkCounts: Record<string, number> = {};
      existingMilkCounts
        .filter((mc) => mc.schoolMenuId === sm.id)
        .forEach((mc) => { milkCounts[`${mc.mealId}-${mc.ageGroupId}-${mc.milkTypeId}`] = mc.count; });

      return {
        schoolId: s.id,
        schoolName: s.name,
        schoolMenuId: sm.id,
        menuName: sm.menu.name,
        isClosed: false,
        milkCounts,
      };
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Milk Counts</h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} school/menu combos · click away to save
        </span>
      </div>
      <MilkCountGrid
        schools={rows}
        meals={meals}
        ageGroups={ageGroups}
        milkTypes={milkTypes}
      />
    </div>
  );
}
