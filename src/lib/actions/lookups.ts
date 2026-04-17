"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const NameSchema = z.object({ name: z.string().min(1) });
const RouteSchema = z.object({
  name: z.string().min(1),
  driver: z.string().optional(),
});

// Routes
export async function createRoute(data: z.infer<typeof RouteSchema>) {
  await prisma.route.create({ data: RouteSchema.parse(data) });
  revalidatePath("/admin");
}
export async function updateRoute(id: number, data: z.infer<typeof RouteSchema>) {
  await prisma.route.update({ where: { id }, data: RouteSchema.parse(data) });
  revalidatePath("/admin");
}
export async function deleteRoute(id: number) {
  await prisma.route.delete({ where: { id } });
  revalidatePath("/admin");
}

// Counties
export async function createCounty(data: z.infer<typeof NameSchema>) {
  await prisma.county.create({ data: NameSchema.parse(data) });
  revalidatePath("/admin");
}
export async function updateCounty(id: number, data: z.infer<typeof NameSchema>) {
  await prisma.county.update({ where: { id }, data: NameSchema.parse(data) });
  revalidatePath("/admin");
}
export async function deleteCounty(id: number) {
  await prisma.county.delete({ where: { id } });
  revalidatePath("/admin");
}

// Age Groups
const AgeGroupSchema = z.object({
  name: z.string().min(1),
  startAge: z.coerce.number(),
  endAge: z.coerce.number(),
});
export async function createAgeGroup(data: z.infer<typeof AgeGroupSchema>) {
  await prisma.ageGroup.create({ data: AgeGroupSchema.parse(data) });
  revalidatePath("/admin");
}
export async function updateAgeGroup(id: number, data: z.infer<typeof AgeGroupSchema>) {
  await prisma.ageGroup.update({ where: { id }, data: AgeGroupSchema.parse(data) });
  revalidatePath("/admin");
}
export async function deleteAgeGroup(id: number) {
  await prisma.ageGroup.delete({ where: { id } });
  revalidatePath("/admin");
}

// Meals
export async function createMeal(data: z.infer<typeof NameSchema>) {
  await prisma.meal.create({ data: NameSchema.parse(data) });
  revalidatePath("/admin");
}
export async function updateMeal(id: number, data: z.infer<typeof NameSchema>) {
  await prisma.meal.update({ where: { id }, data: NameSchema.parse(data) });
  revalidatePath("/admin");
}
export async function deleteMeal(id: number) {
  await prisma.meal.delete({ where: { id } });
  revalidatePath("/admin");
}
