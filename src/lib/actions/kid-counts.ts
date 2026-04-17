"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

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
  revalidatePath("/kid-counts");
}
