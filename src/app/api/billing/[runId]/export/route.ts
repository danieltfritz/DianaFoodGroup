import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { runId: runIdStr } = await params;
  const runId = Number(runIdStr);
  const run = await prisma.billingRun.findUnique({
    where: { id: runId },
    include: {
      details: {
        include: {
          billingRun: true,
        },
      },
    },
  });

  if (!run) return new NextResponse("Not found", { status: 404 });

  // Load related data
  const [schools, meals, ageGroups] = await Promise.all([
    prisma.school.findMany({ select: { id: true, name: true } }),
    prisma.meal.findMany({ select: { id: true, name: true } }),
    prisma.ageGroup.findMany({ select: { id: true, name: true } }),
  ]);

  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));
  const mealMap = Object.fromEntries(meals.map((m) => [m.id, m.name]));
  const ageMap = Object.fromEntries(ageGroups.map((a) => [a.id, a.name]));

  const dateStr = new Date(run.deliveryDate).toLocaleDateString("en-US");

  // CSV header
  const rows = [
    ["School", "Delivery Date", "Meal", "Age Group", "Kid Count", "Unit Price", "Total"].join(","),
  ];

  for (const d of run.details) {
    const total = (d.kidCount * Number(d.priceUsed)).toFixed(2);
    rows.push(
      [
        `"${schoolMap[d.schoolId] ?? d.schoolId}"`,
        dateStr,
        `"${mealMap[d.mealId] ?? d.mealId}"`,
        `"${ageMap[d.ageGroupId] ?? d.ageGroupId}"`,
        d.kidCount,
        Number(d.priceUsed).toFixed(2),
        total,
      ].join(",")
    );
  }

  // Summary totals by school
  rows.push(""); // blank line
  rows.push(["SCHOOL TOTALS", "", "", "", "", "", ""].join(","));
  rows.push(["School", "Total Kids", "Invoice Total"].join(","));

  const bySchool = new Map<number, { kids: number; total: number }>();
  for (const d of run.details) {
    const existing = bySchool.get(d.schoolId) ?? { kids: 0, total: 0 };
    bySchool.set(d.schoolId, {
      kids: existing.kids + d.kidCount,
      total: existing.total + d.kidCount * Number(d.priceUsed),
    });
  }
  for (const [schoolId, { kids, total }] of bySchool) {
    rows.push([`"${schoolMap[schoolId] ?? schoolId}"`, kids, total.toFixed(2)].join(","));
  }

  const csv = rows.join("\n");
  const filename = `billing-${run.deliveryDate.toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
