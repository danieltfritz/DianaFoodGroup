import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { MenuItemsGrid } from "@/components/menus/menu-items-grid";
import { MenuItemsPicker } from "@/components/menus/menu-items-picker";
import { MenuPaperTab } from "@/components/menus/menu-paper-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (isNaN(id)) notFound();

  const [menu, meals, foodItems, ageGroups, paperItemsAll, paperSizesAll, menuPaperItems] = await Promise.all([
    prisma.menu.findUnique({
      where: { id },
      include: {
        items: {
          include: { foodItem: true },
          orderBy: [{ week: "asc" }, { dayId: "asc" }, { mealId: "asc" }],
        },
      },
    }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.paperItem.findMany({ orderBy: { name: "asc" } }),
    prisma.paperSize.findMany({ orderBy: { id: "asc" } }),
    prisma.menuPaperItem.findMany({
      where: { menuId: id },
      orderBy: [{ week: "asc" }, { dayId: "asc" }, { mealId: "asc" }, { ageGroupId: "asc" }],
    }),
  ]);

  if (!menu) notFound();

  const serializedFoodItems = foodItems.map((f) => ({
    ...f,
    containerThreshold: f.containerThreshold == null ? null : Number(f.containerThreshold),
  }));

  const menuItems = menu.items.map((i) => ({
    id: i.id,
    foodItemId: i.foodItemId,
    mealId: i.mealId,
    week: i.week,
    dayId: i.dayId,
    foodItem: { id: i.foodItem.id, name: i.foodItem.name, tempType: i.foodItem.tempType },
  }));

  const serializedMenuItems = menu.items.map((i) => ({
    ...i,
    foodItem: {
      ...i.foodItem,
      containerThreshold: i.foodItem.containerThreshold == null ? null : Number(i.foodItem.containerThreshold),
    },
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/menus" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{menu.name}</h1>
          <p className="text-sm text-muted-foreground">
            {menu.cycleWeeks}-week cycle · Effective {new Date(menu.effectiveDate).toLocaleDateString()}
            {menu.isBoxMenu && " · Box Menu"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="picker">
        <TabsList>
          <TabsTrigger value="picker">Picker</TabsTrigger>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="paper">Paper Items</TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="pt-4">
          <MenuItemsPicker
            menuId={menu.id}
            cycleWeeks={menu.cycleWeeks}
            meals={meals}
            foodItems={serializedFoodItems}
            menuItems={menuItems}
          />
        </TabsContent>

        <TabsContent value="grid" className="pt-4">
          <MenuItemsGrid
            menuId={menu.id}
            cycleWeeks={menu.cycleWeeks}
            meals={meals}
            foodItems={serializedFoodItems}
            menuItems={serializedMenuItems}
          />
        </TabsContent>

        <TabsContent value="paper" className="pt-4">
          <MenuPaperTab
            cycleWeeks={menu.cycleWeeks}
            items={menuPaperItems}
            paperItems={paperItemsAll}
            paperSizes={paperSizesAll}
            meals={meals}
            ageGroups={ageGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
