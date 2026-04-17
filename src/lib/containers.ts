export type ContainerSizeInput = {
  id: number;
  name: string;
  abbreviation: string;
  size: number;
};

export type PackResult = {
  containerSizeId: number;
  sizeLabel: string;
  count: number;
  isPartial: boolean;
};

function sizeLabel(s: ContainerSizeInput): string {
  return `${s.name} (${s.abbreviation})`;
}

/**
 * LeastContainers: fill largest sizes first (greedy), minimizes total container count.
 */
export function packLeastContainers(totalAmount: number, sizes: ContainerSizeInput[]): PackResult[] {
  if (sizes.length === 0 || totalAmount <= 0) return [];

  const sorted = [...sizes].sort((a, b) => b.size - a.size);
  const results: PackResult[] = [];
  let remaining = totalAmount;

  for (const sz of sorted) {
    if (remaining <= 0.0001) break;
    const full = Math.floor(remaining / sz.size);
    if (full > 0) {
      results.push({ containerSizeId: sz.id, sizeLabel: sizeLabel(sz), count: full, isPartial: false });
      remaining -= full * sz.size;
    }
  }

  if (remaining > 0.0001) {
    const smallest = sorted[sorted.length - 1];
    results.push({ containerSizeId: smallest.id, sizeLabel: sizeLabel(smallest), count: 1, isPartial: true });
  }

  return results;
}

/**
 * LeastWaste: for each container size, calculate waste = ceil(amount/size)*size - amount.
 * Picks the single container size with the least waste.
 */
export function packLeastWaste(totalAmount: number, sizes: ContainerSizeInput[]): PackResult[] {
  if (sizes.length === 0 || totalAmount <= 0) return [];

  let bestWaste = Infinity;
  let bestSize: ContainerSizeInput | null = null;

  for (const sz of sizes) {
    const count = Math.ceil(totalAmount / sz.size);
    const waste = count * sz.size - totalAmount;
    if (waste < bestWaste) {
      bestWaste = waste;
      bestSize = sz;
    }
  }

  if (!bestSize) return [];
  const count = Math.ceil(totalAmount / bestSize.size);
  const isPartial = totalAmount % bestSize.size > 0.0001;
  return [{ containerSizeId: bestSize.id, sizeLabel: sizeLabel(bestSize), count, isPartial }];
}

/**
 * Threshold: uses the primary (largest) container size.
 * After filling full containers, if remainder/size < threshold, absorb it
 * into the last container rather than opening a new partial one.
 */
export function packThreshold(
  totalAmount: number,
  sizes: ContainerSizeInput[],
  threshold: number
): PackResult[] {
  if (sizes.length === 0 || totalAmount <= 0) return [];

  const primary = [...sizes].sort((a, b) => b.size - a.size)[0];
  const fullPacks = Math.floor(totalAmount / primary.size);
  const remainder = totalAmount - fullPacks * primary.size;

  if (remainder <= 0.0001) {
    return [{ containerSizeId: primary.id, sizeLabel: sizeLabel(primary), count: fullPacks, isPartial: false }];
  }

  const remainderFraction = remainder / primary.size;

  if (fullPacks === 0) {
    return [{ containerSizeId: primary.id, sizeLabel: sizeLabel(primary), count: 1, isPartial: true }];
  }

  if (remainderFraction < threshold) {
    // Absorb remainder into last full container (show as partial to alert kitchen staff)
    return [{ containerSizeId: primary.id, sizeLabel: sizeLabel(primary), count: fullPacks, isPartial: true }];
  }

  // Open a new container for the remainder
  return [
    { containerSizeId: primary.id, sizeLabel: sizeLabel(primary), count: fullPacks, isPartial: false },
    { containerSizeId: primary.id, sizeLabel: sizeLabel(primary), count: 1, isPartial: true },
  ];
}

/**
 * Dispatch to the correct algorithm based on strategy string.
 * Falls back to LeastContainers for unknown strategy values.
 */
export function packContainers(
  totalAmount: number,
  sizes: ContainerSizeInput[],
  strategy: string,
  threshold: number | null
): PackResult[] {
  if (sizes.length === 0 || totalAmount <= 0) return [];
  switch (strategy) {
    case "LeastWaste":
      return packLeastWaste(totalAmount, sizes);
    case "Threshold":
      return packThreshold(totalAmount, sizes, threshold ?? 0.5);
    case "LeastContainers":
    default:
      return packLeastContainers(totalAmount, sizes);
  }
}

/** Compact display string: "2×Large (5-gal) + 1×Small (1-gal)*" */
export function formatPacks(packs: PackResult[]): string {
  if (packs.length === 0) return "—";
  return packs
    .map((p) => `${p.count}×${p.sizeLabel}${p.isPartial ? "*" : ""}`)
    .join(" + ");
}
