import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchoolMenusTab } from "@/components/schools/school-menus-tab";
import { SchoolClosingsTab } from "@/components/schools/school-closings-tab";

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (isNaN(id)) notFound();

  const [school, menus, schoolMenus, closings] = await Promise.all([
    prisma.school.findUnique({
      where: { id },
      include: { route: true, county: true, billingGroups: { include: { billingGroup: true } } },
    }),
    prisma.menu.findMany({ orderBy: { name: "asc" } }),
    prisma.schoolMenu.findMany({
      where: { schoolId: id },
      include: { menu: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.schoolClosing.findMany({
      where: { schoolId: id },
      orderBy: { startDate: "desc" },
    }),
  ]);

  if (!school) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/schools" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{school.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[school.city, school.state].filter(Boolean).join(", ")}
            {school.route && ` · Route: ${school.route.name}`}
            {school.billingGroups.length > 0 && ` · ${school.billingGroups.map((bg) => bg.billingGroup.name).join(", ")}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="menus">
        <TabsList>
          <TabsTrigger value="menus">Menu Assignments</TabsTrigger>
          <TabsTrigger value="closings">Closings</TabsTrigger>
        </TabsList>
        <TabsContent value="menus" className="mt-4">
          <SchoolMenusTab schoolId={id} menus={menus} schoolMenus={schoolMenus} />
        </TabsContent>
        <TabsContent value="closings" className="mt-4">
          <SchoolClosingsTab schoolId={id} closings={closings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
