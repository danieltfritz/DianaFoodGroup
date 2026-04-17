"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

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
  // Remove existing
  await prisma.billingSchoolGroup.deleteMany({ where: { schoolId } });
  if (billingGroupId) {
    await prisma.billingSchoolGroup.create({ data: { schoolId, billingGroupId } });
  }
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

  // Get all kid counts for this date
  const kidCounts = await prisma.kidCount.findMany({
    where: { date, count: { gt: 0 } },
  });

  if (kidCounts.length === 0) throw new Error("No kid counts found for this date.");

  // Get prices for each kid count
  const details = [];
  for (const kc of kidCounts) {
    // Find the active school menu for this school on this date
    const schoolMenu = await prisma.schoolMenu.findFirst({
      where: {
        schoolId: kc.schoolId,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      orderBy: { startDate: "desc" },
    });
    if (!schoolMenu) continue;

    const price = await prisma.mealPrice.findUnique({
      where: {
        schoolMenuId_schoolId_mealId_ageGroupId: {
          schoolMenuId: schoolMenu.id,
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
