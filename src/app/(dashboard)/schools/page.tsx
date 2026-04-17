import { prisma } from "@/lib/db";
import { SchoolsTable } from "@/components/schools/schools-table";

export default async function SchoolsPage() {
  const [schools, routes, counties] = await Promise.all([
    prisma.school.findMany({
      include: { route: true, county: true },
      orderBy: { name: "asc" },
    }),
    prisma.route.findMany({ orderBy: { name: "asc" } }),
    prisma.county.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <SchoolsTable schools={schools} routes={routes} counties={counties} />;
}
