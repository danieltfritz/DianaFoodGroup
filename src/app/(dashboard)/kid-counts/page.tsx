import { prisma } from "@/lib/db";
import { schoolDeliversOn, parseLocalDate } from "@/lib/cycle";
import { KidCountGrid } from "@/components/kid-counts/kid-count-grid";
import { DateNav } from "@/components/kid-counts/date-nav";
import { CopyLastWeekButton } from "@/components/kid-counts/copy-last-week-button";

export default async function KidCountsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = parseLocalDate(dateStr);

  const [allSchools, meals, ageGroups, existingCounts, existingMilkCounts, milkTypes, closings] = await Promise.all([
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
    prisma.kidCount.findMany({ where: { date } }),
    prisma.milkCount.findMany({ where: { date } }),
    prisma.milkType.findMany({ orderBy: { id: "asc" } }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    }),
  ]);

  const closedSchoolIds = new Set(closings.map((c) => c.schoolId));

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
      const milkCounts: Record<string, number> = {};
      existingMilkCounts
        .filter((mc) => mc.schoolId === s.id)
        .forEach((mc) => {
          milkCounts[`${mc.mealId}-${mc.milkTypeId}`] = mc.count;
        });

      return {
        schoolId: s.id,
        schoolName: s.name,
        schoolMenuId: schoolMenu.id,
        isClosed: closedSchoolIds.has(s.id),
        counts,
        milkCounts,
      };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Kid Counts</h1>
        <DateNav date={dateStr} />
        <CopyLastWeekButton date={dateStr} />
        <span className="text-sm text-muted-foreground">
          {schools.filter((s) => !s.isClosed).length} schools · click away to save
        </span>
      </div>
      <KidCountGrid
        date={dateStr}
        schools={schools}
        meals={meals}
        ageGroups={ageGroups}
        milkTypes={milkTypes}
      />
    </div>
  );
}
