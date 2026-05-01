"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getServingDates } from "@/lib/production/serving-dates";
import { resolveProductionMenus } from "@/lib/production/resolve-menus";
import { calculateAmounts } from "@/lib/production/calculate-amounts";
import { packContainers } from "@/lib/production/pack-containers";

const RunSchema = z.object({
  productionDate: z.coerce.date(),
});

export async function runProduction(data: z.infer<typeof RunSchema>) {
  const { productionDate } = RunSchema.parse(data);

  const specs = getServingDates(productionDate);

  for (const spec of specs) {
    // Delete any existing production run for this date (idempotent)
    const existing = await prisma.production.findUnique({
      where: { productionDate: spec.productionDate },
    });

    if (existing) {
      // Delete children in dependency order
      const menuIds = await prisma.productionMenu.findMany({
        where: { productionId: existing.id },
        select: { id: true },
      });
      const amtIds = await prisma.productionAmt.findMany({
        where: { productionMenuId: { in: menuIds.map((m) => m.id) } },
        select: { id: true },
      });
      const milkIds = await prisma.productionMilk.findMany({
        where: { productionId: existing.id },
        select: { id: true },
      });

      await prisma.productionContainer.deleteMany({
        where: { productionAmtId: { in: amtIds.map((a) => a.id) } },
      });
      await prisma.productionMilkContainer.deleteMany({
        where: { productionMilkId: { in: milkIds.map((m) => m.id) } },
      });
      await prisma.productionAmt.deleteMany({
        where: { productionMenuId: { in: menuIds.map((m) => m.id) } },
      });
      await prisma.productionMilk.deleteMany({ where: { productionId: existing.id } });
      await prisma.productionMenu.deleteMany({ where: { productionId: existing.id } });
      await prisma.production.delete({ where: { id: existing.id } });
    }

    // Create new Production record
    const production = await prisma.production.create({
      data: {
        productionDate: spec.productionDate,
        deliveryDate: spec.deliveryDate,
        servingDateLSD: spec.servingDateLSD,
        servingDateB: spec.servingDateB,
      },
    });

    // Phase 3 — resolve which schools/menus are in scope
    await resolveProductionMenus(production.id, spec);

    // Phase 4 — calculate food amounts
    await calculateAmounts(production.id);

    // Phase 5 — pack into containers
    await packContainers(production.id);
  }

  revalidatePath("/production");
}

export async function deleteProduction(productionId: number) {
  const menuIds = await prisma.productionMenu.findMany({
    where: { productionId },
    select: { id: true },
  });
  const amtIds = await prisma.productionAmt.findMany({
    where: { productionMenuId: { in: menuIds.map((m) => m.id) } },
    select: { id: true },
  });
  const milkIds = await prisma.productionMilk.findMany({
    where: { productionId },
    select: { id: true },
  });

  await prisma.productionContainer.deleteMany({
    where: { productionAmtId: { in: amtIds.map((a) => a.id) } },
  });
  await prisma.productionMilkContainer.deleteMany({
    where: { productionMilkId: { in: milkIds.map((m) => m.id) } },
  });
  await prisma.productionAmt.deleteMany({
    where: { productionMenuId: { in: menuIds.map((m) => m.id) } },
  });
  await prisma.productionMilk.deleteMany({ where: { productionId } });
  await prisma.productionMenu.deleteMany({ where: { productionId } });
  await prisma.production.delete({ where: { id: productionId } });

  revalidatePath("/production");
}
