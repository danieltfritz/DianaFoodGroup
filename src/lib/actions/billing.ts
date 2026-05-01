"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { schoolDeliversOn } from "@/lib/cycle";

// ─── Billing Groups ───────────────────────────────────────────────────────────

const GroupSchema = z.object({ name: z.string().min(1) });

export async function createBillingGroup(data: z.infer<typeof GroupSchema>) {
  await prisma.billingGroup.create({ data: GroupSchema.parse(data) });
  revalidatePath("/billing");
}

export async function updateBillingGroup(id: number, data: z.infer<typeof GroupSchema>) {
  await prisma.billingGroup.update({ where: { id }, data: GroupSchema.parse(data) });
  revalidatePath("/billing");
}

export async function deleteBillingGroup(id: number) {
  await prisma.billingGroup.delete({ where: { id } });
  revalidatePath("/billing");
}

export async function setSchoolBillingGroup(schoolId: number, billingGroupId: number | null) {
  await prisma.billingSchoolGroup.deleteMany({ where: { schoolId } });
  if (billingGroupId) {
    await prisma.billingSchoolGroup.create({ data: { schoolId, billingGroupId } });
  }
  revalidatePath("/billing");
}

export async function addSchoolToBillingGroup(schoolId: number, billingGroupId: number) {
  await prisma.billingSchoolGroup.upsert({
    where: { billingGroupId_schoolId: { billingGroupId, schoolId } },
    create: { schoolId, billingGroupId },
    update: {},
  });
  revalidatePath("/billing");
}

export async function removeSchoolFromBillingGroup(schoolId: number, billingGroupId: number) {
  await prisma.billingSchoolGroup.deleteMany({ where: { schoolId, billingGroupId } });
  revalidatePath("/billing");
}

// ─── Meal Prices ──────────────────────────────────────────────────────────────

const PriceSchema = z.object({
  schoolMenuId: z.coerce.number(),
  schoolId: z.coerce.number(),
  mealId: z.coerce.number(),
  ageGroupId: z.coerce.number(),
  price: z.coerce.number().min(0),
});

export async function upsertMealPrice(data: z.infer<typeof PriceSchema>) {
  const parsed = PriceSchema.parse(data);
  await prisma.mealPrice.upsert({
    where: {
      schoolMenuId_schoolId_mealId_ageGroupId: {
        schoolMenuId: parsed.schoolMenuId,
        schoolId: parsed.schoolId,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
      },
    },
    create: parsed,
    update: { price: parsed.price },
  });
  revalidatePath("/billing");
}

// ─── Billing Runs ─────────────────────────────────────────────────────────────

export async function createBillingRun(deliveryDate: Date) {
  const date = new Date(deliveryDate);
  date.setHours(0, 0, 0, 0);

  // Find schools delivering on this date and their active menus
  const [schoolMenus, closings] = await Promise.all([
    prisma.schoolMenu.findMany({
      where: {
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: { school: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.schoolClosing.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { schoolId: true },
    }),
  ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));
  const activeMenuIds: number[] = [];
  for (const sm of schoolMenus) {
    if (closedIds.has(sm.schoolId)) continue;
    if (!schoolDeliversOn(sm.school, date)) continue;
    activeMenuIds.push(sm.id);
  }

  const kidCounts = await prisma.kidCount.findMany({
    where: {
      schoolMenuId: activeMenuIds.length > 0 ? { in: activeMenuIds } : { in: [-1] },
      count: { gt: 0 },
    },
  });

  if (kidCounts.length === 0) throw new Error("No kid counts found for this date.");

  // Get prices for each kid count
  const details = [];
  for (const kc of kidCounts) {
    const price = await prisma.mealPrice.findUnique({
      where: {
        schoolMenuId_schoolId_mealId_ageGroupId: {
          schoolMenuId: kc.schoolMenuId,
          schoolId: kc.schoolId,
          mealId: kc.mealId,
          ageGroupId: kc.ageGroupId,
        },
      },
    });

    details.push({
      schoolId: kc.schoolId,
      mealId: kc.mealId,
      ageGroupId: kc.ageGroupId,
      isBox: false,
      kidCount: kc.count,
      priceUsed: price ? Number(price.price) : 0,
    });
  }

  const run = await prisma.billingRun.create({
    data: {
      deliveryDate: date,
      details: { create: details },
    },
  });

  revalidatePath("/billing");
  return run.id;
}

export async function deleteBillingRun(id: number) {
  await prisma.billingRun.delete({ where: { id } });
  revalidatePath("/billing");
}
