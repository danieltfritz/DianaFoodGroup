"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SchoolSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  fax: z.string().optional(),
  routeId: z.coerce.number().nullable(),
  countyId: z.coerce.number().nullable(),
  deliveryMon: z.boolean().default(false),
  deliveryTue: z.boolean().default(false),
  deliveryWed: z.boolean().default(false),
  deliveryThu: z.boolean().default(false),
  deliveryFri: z.boolean().default(false),
  deliverySat: z.boolean().default(false),
  deliverySun: z.boolean().default(false),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  milkTier: z.enum(["small", "medium", "large"]).default("medium"),
});

export async function createSchool(data: z.infer<typeof SchoolSchema>) {
  const parsed = SchoolSchema.parse(data);
  await prisma.school.create({ data: parsed });
  revalidatePath("/schools");
}

export async function updateSchool(id: number, data: z.infer<typeof SchoolSchema>) {
  const parsed = SchoolSchema.parse(data);
  await prisma.school.update({ where: { id }, data: parsed });
  revalidatePath("/schools");
}

export async function deleteSchool(id: number) {
  await prisma.school.delete({ where: { id } });
  revalidatePath("/schools");
}
