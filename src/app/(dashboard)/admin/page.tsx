import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [routes, counties, ageGroups, meals, foodItems, containers, users, auditRaw, paperItems, paperGroups] = await Promise.all([
    prisma.route.findMany({ orderBy: { name: "asc" } }),
    prisma.county.findMany({ orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.container.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.kidCountAudit.findMany({
      orderBy: { changedAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.paperItem.findMany({
      orderBy: { name: "asc" },
      include: { sizes: { orderBy: { id: "asc" } }, containers: { orderBy: { id: "asc" } } },
    }),
    prisma.paperGroup.findMany({
      orderBy: { name: "asc" },
      include: { schools: { select: { schoolId: true } } },
    }),
  ]);

  // Join school/meal/ageGroup names for audit entries
  const [schools, mealsLookup, ageGroupsLookup] = await Promise.all([
    prisma.school.findMany({ select: { id: true, name: true } }),
    prisma.meal.findMany({ select: { id: true, name: true } }),
    prisma.ageGroup.findMany({ select: { id: true, name: true } }),
  ]);
  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));
  const mealMap = Object.fromEntries(mealsLookup.map((m) => [m.id, m.name]));
  const ageMap = Object.fromEntries(ageGroupsLookup.map((a) => [a.id, a.name]));

  const auditEntries = auditRaw.map((e) => ({
    id: e.id,
    schoolName: schoolMap[e.schoolId] ?? String(e.schoolId),
    date: e.date,
    mealName: mealMap[e.mealId] ?? String(e.mealId),
    ageGroupName: ageMap[e.ageGroupId] ?? String(e.ageGroupId),
    oldCount: e.oldCount,
    newCount: e.newCount,
    userName: e.user.name,
    userEmail: e.user.email,
    changedAt: e.changedAt,
  }));

  const serializedFoodItems = foodItems.map((f) => ({
    ...f,
    containerThreshold: f.containerThreshold == null ? null : Number(f.containerThreshold),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/import-kid-counts" />}>
          Import Kid Counts
        </Button>
      </div>
    <AdminTabs
      routes={routes}
      counties={counties}
      ageGroups={ageGroups}
      meals={meals}
      foodItems={serializedFoodItems}
      containers={containers}
      users={users}
      currentUserId={session.user!.id!}
      auditEntries={auditEntries}
      paperItems={paperItems}
      paperGroups={paperGroups}
      schoolMap={schoolMap}
    />
    </div>
  );
}
