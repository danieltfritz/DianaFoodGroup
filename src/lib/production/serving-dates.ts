export type ProductionDaySpec = {
  productionDate: Date;
  deliveryDate: Date;
  servingDateLSD: Date;
  servingDateB: Date;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getUTCMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Mirrors VBA DatePart("W", date, vbMonday): 1=Mon … 7=Sun
export function getMenuDay(date: Date): number {
  const day = date.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  return day === 0 ? 7 : day;
}

// Mirrors VBA DateDiff("W", startDate, prodDate, vbMonday) Mod cycle + 1
export function getMenuWeek(effectiveDate: Date, servingDate: Date, cycleWeeks: number): number {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const startMonday = getUTCMonday(effectiveDate);
  const servingMonday = getUTCMonday(servingDate);
  const weeks = Math.round((servingMonday.getTime() - startMonday.getTime()) / MS_PER_WEEK);
  return (((weeks % cycleWeeks) + cycleWeeks) % cycleWeeks) + 1;
}

/**
 * Returns one or more ProductionDaySpec objects for the given production date,
 * mirroring the original Access CalculateProduction routine.
 *
 * Thursday (curDay=4) returns three specs: Thu→Fri, Sat, Sun.
 * Friday (curDay=5) shifts the base to Sunday for "tomorrow" calculations.
 * All other days return a single spec.
 */
export function getServingDates(productionDate: Date): ProductionDaySpec[] {
  const curDay = getMenuDay(productionDate); // 1=Mon … 7=Sun

  // Friday: shift base date to Sunday so "tomorrow" = Monday
  const baseDate = curDay === 5 ? addDays(productionDate, 2) : productionDate;

  const deliveryDate = addDays(baseDate, 1);
  const servingDateLSD = addDays(baseDate, 1);

  // Thursday breakfast serves Monday; otherwise day after tomorrow
  const servingDateB = curDay === 4 ? addDays(baseDate, 4) : addDays(baseDate, 2);

  const primary: ProductionDaySpec = {
    productionDate,
    deliveryDate,
    servingDateLSD,
    servingDateB,
  };

  // Thursday also produces Saturday and Sunday (kitchen is closed weekends)
  if (curDay === 4) {
    const saturday = addDays(productionDate, 2);
    const sunday = addDays(productionDate, 3);
    return [
      primary,
      { productionDate: saturday, deliveryDate: saturday, servingDateLSD: saturday, servingDateB: saturday },
      { productionDate: sunday, deliveryDate: sunday, servingDateLSD: sunday, servingDateB: sunday },
    ];
  }

  return [primary];
}
