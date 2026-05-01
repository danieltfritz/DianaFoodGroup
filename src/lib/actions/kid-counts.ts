"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const MilkCountSchema = z.object({
  schoolId: z.coerce.number(),
  schoolMenuId: z.coerce.number(),
  mealId: z.coerce.number(),
  ageGroupId: z.coerce.number(),
  milkTypeId: z.coerce.number(),
  count: z.coerce.number().min(0),
});

export async function upsertMilkCount(data: z.infer<typeof MilkCountSchema>) {
  const parsed = MilkCountSchema.parse(data);
  await prisma.milkCount.upsert({
    where: {
      schoolMenuId_mealId_ageGroupId_milkTypeId: {
        schoolMenuId: parsed.schoolMenuId,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
        milkTypeId: parsed.milkTypeId,
      },
    },
    create: parsed,
    update: { count: parsed.count },
  });
  revalidatePath("/milk-counts");
}

const KidCountSchema = z.object({
  schoolId: z.coerce.number(),
  schoolMenuId: z.coerce.number(),
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
      schoolMenuId_mealId_ageGroupId: {
        schoolMenuId: parsed.schoolMenuId,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
      },
    },
  });

  const oldCount = existing?.count ?? 0;

  await prisma.kidCount.upsert({
    where: {
      schoolMenuId_mealId_ageGroupId: {
        schoolMenuId: parsed.schoolMenuId,
        mealId: parsed.mealId,
        ageGroupId: parsed.ageGroupId,
      },
    },
    create: parsed,
    update: { count: parsed.count },
  });

  if (userId && oldCount !== parsed.count) {
    await prisma.kidCountAudit.create({
      data: {
        schoolId: parsed.schoolId,
        schoolMenuId: parsed.schoolMenuId,
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

const OverrideSchema = z.object({
  schoolId: z.coerce.number(),
  sourceSchoolMenuId: z.coerce.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function createMenuOverride(data: z.infer<typeof OverrideSchema>) {
  const { schoolId, sourceSchoolMenuId, startDate, endDate } = OverrideSchema.parse(data);
  console.log("[createMenuOverride] start", { schoolId, sourceSchoolMenuId, startDate, endDate });

  const source = await prisma.schoolMenu.findUnique({ where: { id: sourceSchoolMenuId } });
  if (!source) throw new Error("Source menu not found");

  const [kidCounts, mealPrices] = await Promise.all([
    prisma.kidCount.findMany({ where: { schoolMenuId: sourceSchoolMenuId } }),
    prisma.mealPrice.findMany({ where: { schoolMenuId: sourceSchoolMenuId } }),
  ]);

  const newMenu = await prisma.schoolMenu.create({
    data: { schoolId, menuId: source.menuId, startDate, endDate },
  });

  // KidCounts and MealPrices via ORM (client knows these fields)
  await Promise.all([
    kidCounts.length > 0
      ? prisma.kidCount.createMany({
          data: kidCounts.map((kc) => ({
            schoolId: kc.schoolId,
            schoolMenuId: newMenu.id,
            mealId: kc.mealId,
            ageGroupId: kc.ageGroupId,
            count: kc.count,
          })),
        })
      : Promise.resolve(),
    mealPrices.length > 0
      ? prisma.mealPrice.createMany({
          data: mealPrices.map((mp) => ({
            schoolMenuId: newMenu.id,
            schoolId: mp.schoolId,
            mealId: mp.mealId,
            ageGroupId: mp.ageGroupId,
            price: mp.price,
          })),
        })
      : Promise.resolve(),
  ]);

  // MilkCounts — [count] must be quoted, it's a reserved word in SQL Server
  await prisma.$executeRawUnsafe(
    `INSERT INTO MilkCount (schoolId, schoolMenuId, mealId, ageGroupId, milkTypeId, [count])
     SELECT schoolId, ${newMenu.id}, mealId, ageGroupId, milkTypeId, [count]
     FROM MilkCount
     WHERE schoolMenuId = ${sourceSchoolMenuId}`
  );

  console.log("[createMenuOverride] done, newMenuId:", newMenu.id);
  revalidatePath("/kid-counts");
  return newMenu.id;
}

export async function deleteMenuOverride(schoolMenuId: number) {
  const menu = await prisma.schoolMenu.findUnique({ where: { id: schoolMenuId } });
  if (!menu) throw new Error("Menu not found");
  if (!menu.endDate) throw new Error("Cannot delete a permanent menu — only overrides with an end date can be deleted.");

  await prisma.kidCount.deleteMany({ where: { schoolMenuId } });
  await prisma.milkCount.deleteMany({ where: { schoolMenuId } });
  await prisma.mealPrice.deleteMany({ where: { schoolMenuId } });
  await prisma.schoolMenu.delete({ where: { id: schoolMenuId } });

  revalidatePath("/kid-counts");
}
