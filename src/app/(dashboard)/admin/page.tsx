import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [routes, counties, ageGroups, meals, foodItems, containers, users, auditRaw] = await Promise.all([
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
      include: {
        user: { select: { name: true, email: true } },
      },
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
    />
  );
}
