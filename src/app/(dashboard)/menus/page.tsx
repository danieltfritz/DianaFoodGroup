import { prisma } from "@/lib/db";
import { MenusList } from "@/components/menus/menus-list";

export default async function MenusPage() {
  const menus = await prisma.menu.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true, schoolMenus: true } } },
  });

  return <MenusList menus={menus} />;
}
