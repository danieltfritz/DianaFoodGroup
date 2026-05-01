/** Parse a YYYY-MM-DD string as UTC midnight — consistent with how Prisma returns @db.Date values. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

export function isThursday(date: Date): boolean {
  return date.getUTCDay() === 4;
}

/**
 * Returns which production batch a meal belongs to.
 * LSD = Last Serving Day (today's truck: Lunch, Dinner, Snack unless delayed)
 * TomB = Tomorrow Breakfast (next-morning delivery: Breakfast, Snack when delaySnack=true)
 */
export function getBatch(mealName: string, delaySnack: boolean): "LSD" | "TomB" {
  const lower = mealName.toLowerCase();
  if (lower === "breakfast") return "TomB";
  if (lower === "snack") return delaySnack ? "TomB" : "LSD";
  return "LSD";
}

/**
 * Returns the 1-based cycle week for a given date, given the menu's effective date and cycle length.
 * Uses UTC day arithmetic to stay timezone-independent.
 */
export function getCycleWeek(date: Date, effectiveDate: Date, cycleWeeks: number): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((date.getTime() - effectiveDate.getTime()) / msPerDay);
  if (daysSince < 0) return 1;
  return (Math.floor(daysSince / 7) % cycleWeeks) + 1;
}

/**
 * Returns the 1-based day ID where 1=Monday ... 5=Friday, 6=Saturday, 7=Sunday.
 * Uses getUTCDay() so Prisma @db.Date values (always UTC midnight) resolve correctly.
 */
export function getDayId(date: Date): number {
  const day = date.getUTCDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/**
 * Returns true if the school delivers on the given date's weekday.
 * Uses getUTCDay() so Prisma @db.Date values resolve correctly regardless of server timezone.
 */
export function schoolDeliversOn(
  school: {
    deliveryMon: boolean; deliveryTue: boolean; deliveryWed: boolean;
    deliveryThu: boolean; deliveryFri: boolean; deliverySat: boolean; deliverySun: boolean;
  },
  date: Date
): boolean {
  const keys = ["deliverySun", "deliveryMon", "deliveryTue", "deliveryWed", "deliveryThu", "deliveryFri", "deliverySat"];
  return school[keys[date.getUTCDay()] as keyof typeof school] as boolean;
}
