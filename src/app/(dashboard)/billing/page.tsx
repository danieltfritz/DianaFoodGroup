import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingGroupsTab } from "@/components/billing/billing-groups-tab";
import { MealPricesTab } from "@/components/billing/meal-prices-tab";
import { BillingRunsTab } from "@/components/billing/billing-runs-tab";

export default async function BillingPage() {
  const [groups, schools, meals, ageGroups, schoolMenus, runs] = await Promise.all([
    prisma.billingGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: { billingGroups: { select: { billingGroupId: true } } },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.schoolMenu.findMany({
      where: { endDate: null },
      include: {
        school: { select: { id: true, name: true } },
        mealPrices: true,
      },
      orderBy: { school: { name: "asc" } },
    }),
    prisma.billingRun.findMany({
      orderBy: { deliveryDate: "desc" },
      include: { _count: { select: { details: true } } },
    }),
  ]);

  const schoolsWithGroup = schools.map((s) => ({
    id: s.id,
    name: s.name,
    billingGroupId: s.billingGroups[0]?.billingGroupId ?? null,
  }));

  // Build school rows for meal prices tab — one row per active school menu
  const schoolRows = schoolMenus.map((sm) => {
    const priceMap: Record<string, number> = {};
    for (const p of sm.mealPrices) {
      priceMap[`${p.mealId}-${p.ageGroupId}`] = Number(p.price);
    }
    return {
      schoolId: sm.schoolId,
      schoolName: sm.school.name,
      schoolMenuId: sm.id,
      prices: priceMap,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Billing</h1>
      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Billing Runs</TabsTrigger>
          <TabsTrigger value="prices">Meal Prices</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="runs" className="mt-4">
          <BillingRunsTab runs={runs} />
        </TabsContent>
        <TabsContent value="prices" className="mt-4">
          <MealPricesTab
            groups={groups}
            meals={meals}
            ageGroups={ageGroups}
            schoolRows={schoolRows}
          />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <BillingGroupsTab groups={groups} schools={schoolsWithGroup} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
