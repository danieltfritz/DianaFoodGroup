"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const FoodItemSchema = z.object({
  name: z.string().min(1),
  tempType: z.enum(["hot", "cold"]),
  foodTypeId: z.coerce.number().nullable(),
  isMilk: z.boolean().default(false),
  hasLabel: z.boolean().default(true),
  showOnReport: z.boolean().default(true),
  menuTypeId: z.coerce.number().nullable(),
  defaultContainerId: z.coerce.number().nullable(),
  containerThreshold: z.coerce.number().nullable(),
  pkSize: z.coerce.number().nullable(),
  pkUnit: z.string().optional(),
});

export async function createFoodItem(data: z.infer<typeof FoodItemSchema>) {
  await prisma.foodItem.create({ data: FoodItemSchema.parse(data) });
  revalidatePath("/admin");
}

export async function updateFoodItem(id: number, data: z.infer<typeof FoodItemSchema>) {
  await prisma.foodItem.update({ where: { id }, data: FoodItemSchema.parse(data) });
  revalidatePath("/admin");
}

export async function deleteFoodItem(id: number) {
  await prisma.foodItem.delete({ where: { id } });
  revalidatePath("/admin");
}

const ContainerSchema = z.object({
  name: z.string().min(1),
  isVariable: z.boolean().default(false),
  allowPartial: z.boolean().default(false),
  units: z.string().optional(),
});

export async function createContainer(data: z.infer<typeof ContainerSchema>) {
  await prisma.container.create({ data: ContainerSchema.parse(data) });
  revalidatePath("/admin");
}

export async function updateContainer(id: number, data: z.infer<typeof ContainerSchema>) {
  await prisma.container.update({ where: { id }, data: ContainerSchema.parse(data) });
  revalidatePath("/admin");
}

export async function deleteContainer(id: number) {
  await prisma.container.delete({ where: { id } });
  revalidatePath("/admin");
}

const ServingSizeSchema = z.object({
  mealId: z.coerce.number(),
  foodItemId: z.coerce.number(),
  ageGroupId: z.coerce.number(),
  servingSize: z.coerce.number(),
});

export async function upsertServingSize(data: z.infer<typeof ServingSizeSchema>) {
  const parsed = ServingSizeSchema.parse(data);
  await prisma.servingSize.upsert({
    where: { mealId_foodItemId_ageGroupId: { mealId: parsed.mealId, foodItemId: parsed.foodItemId, ageGroupId: parsed.ageGroupId } },
    create: { mealId: parsed.mealId, foodItemId: parsed.foodItemId, ageGroupId: parsed.ageGroupId, servingSize: parsed.servingSize },
    update: { servingSize: parsed.servingSize },
  });
  revalidatePath("/admin");
}
