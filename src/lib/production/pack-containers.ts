import { prisma } from "@/lib/db";

type Slot = {
  containerSizeId: number;
  count: number;
  size: number;       // effective oz per container (containerSize × pkSize)
  foodInSlot: number; // total food accounted for in this slot
  allowPartial: boolean;
  threshold: number | null;
};

function roundUp(x: number): number {
  return Math.floor(x) < x ? Math.floor(x) + 1 : x;
}

// Mirrors VBA LeastContainers — consolidate into fewest containers when allowPartial=true
function leastContainers(slots: Slot[]): void {
  let idx = slots.length - 1;
  while (idx > 0 && slots[idx].foodInSlot === 0) idx--;
  if (idx <= 0) return;

  let ccnt = slots[idx].count;
  let foodAmt = 0;

  while (idx > 0) {
    foodAmt = slots[idx].foodInSlot + slots[idx - 1].foodInSlot;
    const avail = (slots[idx - 1].count + 1) * slots[idx - 1].size;
    idx--;
    if (ccnt > 1 && foodAmt <= avail) {
      slots[idx].count += 1;
      ccnt = slots[idx].count;
      slots[idx].foodInSlot = foodAmt;
      for (let j = idx + 1; j < slots.length; j++) { slots[j].count = 0; slots[j].foodInSlot = 0; }
    } else {
      ccnt = slots[idx].count + ccnt;
    }
  }
}

// Mirrors VBA LeastWaste — consolidate when it reduces waste
function leastWaste(slots: Slot[]): void {
  let idx = slots.length - 1;
  while (idx > 0 && slots[idx].foodInSlot === 0) idx--;
  if (idx <= 0) return;

  let waste1 = (slots[idx].count * slots[idx].size) - slots[idx].foodInSlot;
  let foodAmt = slots[idx].foodInSlot;

  while (idx > 0) {
    idx--;
    foodAmt += slots[idx].foodInSlot;
    const waste2 = ((slots[idx].count + 1) * slots[idx].size) - foodAmt;
    if (waste2 <= waste1) {
      slots[idx].count += 1;
      slots[idx].foodInSlot = foodAmt;
      waste1 = waste2;
      for (let j = idx + 1; j < slots.length; j++) { slots[j].count = 0; slots[j].foodInSlot = 0; }
    }
  }
}

// Mirrors VBA Threshold — consolidate when food exceeds threshold × containerSize
function thresholdStrategy(slots: Slot[]): void {
  let idx = slots.length - 1;
  while (idx > 0 && slots[idx].foodInSlot === 0) idx--;
  if (idx <= 0) return;

  let foodAmt = slots[idx].count * slots[idx].size;

  while (idx > 0) {
    idx--;
    const thresh = slots[idx].threshold ?? 0;
    const overThreshold = thresh * slots[idx].size <= foodAmt;
    foodAmt += slots[idx].count * slots[idx].size;
    if (overThreshold) {
      slots[idx].count += 1;
      slots[idx].foodInSlot = foodAmt;
      for (let j = idx + 1; j < slots.length; j++) { slots[j].count = 0; slots[j].foodInSlot = 0; }
    }
  }
}

// Mirrors VBA CalculateMilk — milk-specific rounding with gallon percentage rules
function fillMilkSlots(slots: Slot[], foodAmt: number): void {
  const overPct = ((foodAmt / 128) - Math.floor(foodAmt / 128)) * 100;
  let remaining = foodAmt;

  for (let i = 0; i < slots.length; i++) {
    const count = Math.floor(remaining / slots[i].size);
    remaining -= count * slots[i].size;
    slots[i].count = count;
    slots[i].foodInSlot = count * slots[i].size;
  }

  const last = slots[slots.length - 1];
  const totalAmt = slots.reduce((s, sl) => s + sl.foodInSlot, 0);

  // Special rounding: always give at least something
  const onlyHalfPints = slots.length === 1 && last.size === 8;
  const shouldRoundUp =
    totalAmt === 0 ||
    (onlyHalfPints && remaining > 2) ||
    ((overPct > 5 && overPct < 50) || (overPct === 50 && last.size === 128) || overPct > 65);

  if (shouldRoundUp) {
    last.count += 1;
    last.foodInSlot = last.count * last.size;
  }
}

// Initial filling for non-milk items — largest container first, remainder cascades down
function fillSlots(sizes: { id: number; size: number; allowPartial: boolean; threshold: number | null }[], foodAmt: number, pkSize: number): Slot[] {
  const slots: Slot[] = [];
  let remaining = foodAmt;

  for (let i = 0; i < sizes.length; i++) {
    const effectiveSize = sizes[i].size * pkSize;
    const count = Math.floor(remaining / effectiveSize);
    remaining -= count * effectiveSize;

    const isLast = i === sizes.length - 1;
    const foodInSlot = isLast ? count * effectiveSize + remaining : count * effectiveSize;
    const finalCount = isLast && remaining > 0 ? count + 1 : count;

    slots.push({
      containerSizeId: sizes[i].id,
      count: finalCount,
      size: effectiveSize,
      foodInSlot,
      allowPartial: sizes[i].allowPartial,
      threshold: sizes[i].threshold,
    });

    if (isLast) remaining = 0;
  }

  return slots;
}

function applyStrategy(slots: Slot[]): void {
  const last = slots[slots.length - 1];
  if (last.allowPartial) {
    leastContainers(slots);
  } else if (last.threshold !== null) {
    thresholdStrategy(slots);
  } else {
    leastWaste(slots);
  }
}

// Convert packed slots to container rows, handling partial containers
function slotsToContainerRows(slots: Slot[], pkSize: number): { containerSizeId: number; containerCount: number; partialQty: number | null }[] {
  const rows: { containerSizeId: number; containerCount: number; partialQty: number | null }[] = [];

  for (const slot of slots) {
    if (slot.count === 0) continue;

    // Check for a partial (last unit in this slot isn't full)
    const remainder = ((slot.foodInSlot * 1000) % (slot.size * 1000)) / 1000;

    if (slot.allowPartial && remainder > 0) {
      const partialPacks = roundUp(remainder / pkSize);
      const packsPerContainer = slot.size / pkSize;

      if (partialPacks !== packsPerContainer) {
        // One partial container + remaining full containers
        if (slot.count - 1 > 0) {
          rows.push({ containerSizeId: slot.containerSizeId, containerCount: slot.count - 1, partialQty: null });
        }
        rows.push({ containerSizeId: slot.containerSizeId, containerCount: 1, partialQty: partialPacks });
        continue;
      }
    }

    rows.push({ containerSizeId: slot.containerSizeId, containerCount: slot.count, partialQty: null });
  }

  return rows;
}

export async function packContainers(productionId: number): Promise<void> {
  const [productionAmts, productionMilks] = await Promise.all([
    prisma.productionAmt.findMany({
      where: { productionMenu: { productionId } },
      include: {
        foodItem: {
          include: {
            container: { include: { sizes: { orderBy: { size: "desc" } } } },
          },
        },
      },
    }),
    prisma.productionMilk.findMany({
      where: { productionId },
      include: {
        foodItem: {
          include: {
            container: { include: { sizes: { orderBy: { size: "desc" } } } },
          },
        },
      },
    }),
  ]);

  const containerRows: { productionAmtId: number; containerSizeId: number; containerCount: number; partialQty: number | null }[] = [];
  const milkContainerRows: { productionMilkId: number; containerSizeId: number; containerCount: number; oldContainerCount: number; partialQty: number | null }[] = [];

  // ── Non-milk ─────────────────────────────────────────────────────────────────
  for (const amt of productionAmts) {
    const food = amt.foodItem;
    if (!food.container || food.container.sizes.length === 0) continue;

    const foodAmt = Number(amt.foodAmt);
    if (foodAmt <= 0) continue;

    const pkSize = food.pkSize ?? 1;
    const container = food.container;

    const sizes = container.sizes.map((cs) => ({
      id: cs.id,
      size: container.isVariable ? foodAmt * Number(cs.size) : Number(cs.size),
      allowPartial: container.allowPartial,
      threshold: food.containerThreshold !== null ? Number(food.containerThreshold) : null,
    }));

    const slots = fillSlots(sizes, foodAmt, pkSize);
    applyStrategy(slots);
    const rows = slotsToContainerRows(slots, pkSize);

    for (const r of rows) {
      containerRows.push({ productionAmtId: amt.id, ...r });
    }
  }

  // ── Milk ─────────────────────────────────────────────────────────────────────
  for (const milk of productionMilks) {
    const food = milk.foodItem;
    if (!food.container || food.container.sizes.length === 0) continue;

    const foodAmt = Number(milk.foodAmt);
    if (foodAmt <= 0) continue;

    const container = food.container;

    const slots: Slot[] = container.sizes.map((cs) => ({
      containerSizeId: cs.id,
      count: 0,
      size: Number(cs.size),
      foodInSlot: 0,
      allowPartial: container.allowPartial,
      threshold: food.containerThreshold !== null ? Number(food.containerThreshold) : null,
    }));

    fillMilkSlots(slots, foodAmt);

    for (const slot of slots) {
      if (slot.count === 0) continue;
      milkContainerRows.push({
        productionMilkId: milk.id,
        containerSizeId: slot.containerSizeId,
        containerCount: slot.count,
        oldContainerCount: slot.count,
        partialQty: null,
      });
    }
  }

  await Promise.all([
    containerRows.length > 0
      ? prisma.productionContainer.createMany({ data: containerRows })
      : Promise.resolve(),
    milkContainerRows.length > 0
      ? prisma.productionMilkContainer.createMany({ data: milkContainerRows })
      : Promise.resolve(),
  ]);
}
