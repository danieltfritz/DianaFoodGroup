"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const MilkCountSchema = z.object({
  schoolId: z.coerce.number(),
  date: z.coerce.date(),
  mealId: z.coerce.number(),
  milkTypeId: z.coerce.number(),
  count: z.coerce.number().min(0),
});

export async function upsertMilkCount(data: z.infer<typeof MilkCountSchema>) {
  const parsed = MilkCountSchema.parse(data);
  await prisma.milkCount.upsert({
    where: {
      schoolId_date_mealId_milkTypeId: {
        schoolId: parsed.schoolId,
        date: parsed.date,
        mealId: parsed.mealId,
        milkTypeId: parsed.milkTypeId,
      },
    },
    create: parsed,
    update: { count: parsed.count },
  });
  revalidatePath("/kid-counts");
}

const KidCountSchema = z.object({
  schoolId: z.coerce.number(),
  schoolMenuId: z.coerce.number(),
  date: z.coerce.date(),
  mealId: z.coerce.number(),
  ageGroupId: z.coerce.number(),
  count: z.coerce.number().min(0),
});

export async function upsertKidCount(data: z.infer<typeof KidCountSchema>) {
  const parsed = KidCountSchema.parse(data);
  const session = await auth();
  const userId = session?.user?.id;

  const existing = await prisma.kidCount.findUnique({
    where: {
      schoolId_date_mealId_ageGroupId: {
        schoolId: parsed.schoolId,
        date: parsed.date,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
      },
    },
  });

  const oldCount = existing?.count ?? 0;

  await prisma.kidCount.upsert({
    where: {
      schoolId_date_mealId_ageGroupId: {
        schoolId: parsed.schoolId,
        date: parsed.date,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
      },
    },
    create: parsed,
    update: { count: parsed.count, schoolMenuId: parsed.schoolMenuId },
  });

  // Write audit record if count changed and user is known
  if (userId && oldCount !== parsed.count) {
    await prisma.kidCountAudit.create({
      data: {
        schoolId: parsed.schoolId,
        date: parsed.date,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
        oldCount,
        newCount: parsed.count,
        userId,
      },
    });
  }

  revalidatePath("/kid-counts");
}

export async function copyKidCountsFromPreviousWeek(dateStr: string) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const prevWeek = new Date(date);
  prevWeek.setDate(prevWeek.getDate() - 7);

  const session = await auth();
  const userId = session?.user?.id;

  const sourceCounts = await prisma.kidCount.findMany({
    where: { date: prevWeek, count: { gt: 0 } },
  });

  if (sourceCounts.length === 0) return { copied: 0 };

  let copied = 0;

  for (const kc of sourceCounts) {
    // Find the active school menu for the target date (may differ from source)
    const schoolMenu = await prisma.schoolMenu.findFirst({
      where: {
        schoolId: kc.schoolId,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      orderBy: { startDate: "desc" },
    });

    if (!schoolMenu) continue;

    const existing = await prisma.kidCount.findUnique({
      where: {
        schoolId_date_mealId_ageGroupId: {
          schoolId: kc.schoolId,
          date,
          mealId: kc.mealId,
          ageGroupId: kc.ageGroupId,
        },
      },
    });

    const oldCount = existing?.count ?? 0;

    await prisma.kidCount.upsert({
      where: {
        schoolId_date_mealId_ageGroupId: {
          schoolId: kc.schoolId,
          date,
          mealId: kc.mealId,
          ageGroupId: kc.ageGroupId,
        },
      },
      create: {
        schoolId: kc.schoolId,
        schoolMenuId: schoolMenu.id,
        date,
        mealId: kc.mealId,
        ageGroupId: kc.ageGroupId,
        count: kc.count,
      },
      update: { count: kc.count, schoolMenuId: schoolMenu.id },
    });

    if (userId && oldCount !== kc.count) {
      await prisma.kidCountAudit.create({
        data: {
          schoolId: kc.schoolId,
          date,
          mealId: kc.mealId,
          ageGroupId: kc.ageGroupId,
          oldCount,
          newCount: kc.count,
          userId,
        },
      });
    }

    copied++;
  }

  revalidatePath("/kid-counts");
  return { copied };
}
