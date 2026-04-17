import { prisma } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const [routes, counties, ageGroups, meals, foodItems, containers] = await Promise.all([
    prisma.route.findMany({ orderBy: { name: "asc" } }),
    prisma.county.findMany({ orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.container.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminTabs
      routes={routes}
      counties={counties}
      ageGroups={ageGroups}
      meals={meals}
      foodItems={foodItems}
      containers={containers}
    />
  );
}
