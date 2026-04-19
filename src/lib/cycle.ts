/** Parse a YYYY-MM-DD string as local midnight (avoids UTC-offset day shift). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

export function isThursday(date: Date): boolean {
  return date.getDay() === 4;
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
 * Weeks are counted from the Monday of the effectiveDate's week.
 */
export function getCycleWeek(date: Date, effectiveDate: Date, cycleWeeks: number): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((date.getTime() - effectiveDate.getTime()) / msPerDay);
  if (daysSince < 0) return 1;
  return (Math.floor(daysSince / 7) % cycleWeeks) + 1;
}

/**
 * Returns the 1-based day ID where 1=Monday ... 5=Friday, 6=Saturday, 7=Sunday.
 */
export function getDayId(date: Date): number {
  const day = date.getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/**
 * Returns true if the school delivers on the given date's weekday.
 */
export function schoolDeliversOn(
  school: {
    deliveryMon: boolean; deliveryTue: boolean; deliveryWed: boolean;
    deliveryThu: boolean; deliveryFri: boolean; deliverySat: boolean; deliverySun: boolean;
  },
  date: Date
): boolean {
  const keys = ["deliverySun", "deliveryMon", "deliveryTue", "deliveryWed", "deliveryThu", "deliveryFri", "deliverySat"];
  return school[keys[date.getDay()] as keyof typeof school] as boolean;
}
