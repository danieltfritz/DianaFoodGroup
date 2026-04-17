"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SchoolMenuSchema = z.object({
  schoolId: z.coerce.number(),
  menuId: z.coerce.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
});

export async function createSchoolMenu(data: z.infer<typeof SchoolMenuSchema>) {
  const parsed = SchoolMenuSchema.parse(data);
  await prisma.schoolMenu.create({ data: parsed });
  revalidatePath(`/schools/${parsed.schoolId}`);
}

export async function updateSchoolMenu(id: number, data: z.infer<typeof SchoolMenuSchema>) {
  const parsed = SchoolMenuSchema.parse(data);
  await prisma.schoolMenu.update({ where: { id }, data: parsed });
  revalidatePath(`/schools/${parsed.schoolId}`);
}

export async function deleteSchoolMenu(id: number, schoolId: number) {
  await prisma.schoolMenu.delete({ where: { id } });
  revalidatePath(`/schools/${schoolId}`);
}

const ClosingSchema = z.object({
  schoolId: z.coerce.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function createSchoolClosing(data: z.infer<typeof ClosingSchema>) {
  const parsed = ClosingSchema.parse(data);
  await prisma.schoolClosing.create({ data: parsed });
  revalidatePath(`/schools/${parsed.schoolId}`);
}

export async function deleteSchoolClosing(id: number, schoolId: number) {
  await prisma.schoolClosing.delete({ where: { id } });
  revalidatePath(`/schools/${schoolId}`);
}
