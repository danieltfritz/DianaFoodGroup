"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const MenuSchema = z.object({
  name: z.string().min(1),
  cycleWeeks: z.coerce.number().min(1),
  effectiveDate: z.coerce.date(),
  isBoxMenu: z.boolean().default(false),
  delaySnack: z.boolean().default(false),
  menuTypeId: z.coerce.number().nullable(),
});

export async function createMenu(data: z.infer<typeof MenuSchema>) {
  await prisma.menu.create({ data: MenuSchema.parse(data) });
  revalidatePath("/menus");
}

export async function updateMenu(id: number, data: z.infer<typeof MenuSchema>) {
  await prisma.menu.update({ where: { id }, data: MenuSchema.parse(data) });
  revalidatePath("/menus");
  revalidatePath(`/menus/${id}`);
}

export async function deleteMenu(id: number) {
  await prisma.menu.delete({ where: { id } });
  revalidatePath("/menus");
}

const MenuItemSchema = z.object({
  menuId: z.coerce.number(),
  foodItemId: z.coerce.number(),
  mealId: z.coerce.number(),
  week: z.coerce.number(),
  dayId: z.coerce.number(),
});

export async function addMenuItem(data: z.infer<typeof MenuItemSchema>) {
  const parsed = MenuItemSchema.parse(data);
  const item = await prisma.menuItem.upsert({
    where: { menuId_foodItemId_mealId_week_dayId: parsed },
    create: parsed,
    update: {},
  });
  revalidatePath(`/menus/${parsed.menuId}`);
  return { id: item.id };
}

export async function removeMenuItem(id: number, menuId: number) {
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath(`/menus/${menuId}`);
}
