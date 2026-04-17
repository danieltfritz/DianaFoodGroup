import { prisma } from "@/lib/db";
import { schoolDeliversOn } from "@/lib/cycle";
import { KidCountGrid } from "@/components/kid-counts/kid-count-grid";
import { DateNav } from "@/components/kid-counts/date-nav";

export default async function KidCountsPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = searchParams.date ?? today.toISOString().split("T")[0];
  const date = new Date(dateStr);

  const [allSchools, meals, ageGroups, existingCounts, closings] = await Promise.all([
    prisma.school.findMany({
      where: { active: true },
      include: {
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
      orderBy: { name: "asc" },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.kidCount.findMany({
      where: { date },
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    }),
  ]);

  const closedSchoolIds = new Set(closings.map((c) => c.schoolId));

  // Only include schools that deliver on this day and have an active menu
  const schools = allSchools
    .filter((s) => s.schoolMenus.length > 0 && schoolDeliversOn(s, date))
    .map((s) => {
      const schoolMenu = s.schoolMenus[0];
      const counts: Record<string, number> = {};
      existingCounts
        .filter((kc) => kc.schoolId === s.id)
        .forEach((kc) => {
          counts[`${kc.mealId}-${kc.ageGroupId}`] = kc.count;
        });
      return {
        schoolId: s.id,
        schoolName: s.name,
        schoolMenuId: schoolMenu.id,
        isClosed: closedSchoolIds.has(s.id),
        counts,
      };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kid Counts</h1>
        <DateNav date={dateStr} />
      </div>
      <p className="text-sm text-muted-foreground">
        {schools.filter((s) => !s.isClosed).length} schools delivering · Click away from a cell to save
      </p>
      <KidCountGrid
        date={dateStr}
        schools={schools}
        meals={meals}
        ageGroups={ageGroups}
      />
    </div>
  );
}
