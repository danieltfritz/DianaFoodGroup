import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { MenuItemsGrid } from "@/components/menus/menu-items-grid";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [menu, meals, foodItems] = await Promise.all([
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
  ]);

  if (!menu) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/menus" />}>
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

      <MenuItemsGrid
        menuId={menu.id}
        cycleWeeks={menu.cycleWeeks}
        meals={meals}
        foodItems={foodItems}
        menuItems={menu.items}
      />
    </div>
  );
}
