import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { schoolDeliversOn, addDays } from "@/lib/cycle";
import { School, Building2, UtensilsCrossed, Milk, CheckCircle2, ClipboardList } from "lucide-react";

// Returns the delivery dates that need counts entered today (production window).
// Thu → [Fri, Sat, Sun]. Fri/Sat/Sun → [next Mon]. Mon-Wed → [tomorrow].
function getUpcomingDeliveryDates(today: Date): { dates: Date[]; label: string } {
  const dow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat

  if (dow === 4) {
    // Thursday: produce for Fri, Sat, Sun
    return {
      dates: [addDays(today, 1), addDays(today, 2), addDays(today, 3)],
      label: "This Weekend (Fri – Sun)",
    };
  }
  if (dow === 5 || dow === 6 || dow === 0) {
    // Fri/Sat/Sun: next production prep is Sunday night for Monday
    const daysToMon = dow === 5 ? 3 : dow === 6 ? 2 : 1;
    return {
      dates: [addDays(today, daysToMon)],
      label: `Next Monday (${addDays(today, daysToMon).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
    };
  }
  // Mon/Tue/Wed: tomorrow's delivery
  return {
    dates: [addDays(today, 1)],
    label: `Tomorrow (${addDays(today, 1).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })})`,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { dates: upcomingDates, label: upcomingLabel } = getUpcomingDeliveryDates(today);

  const [allSchools, meals, upcomingKidCounts, upcomingMilkCounts, foodItemCount, menuCount, lastBillingRun, closings] =
    await Promise.all([
      prisma.school.findMany({
        where: { active: true },
        include: {
          schoolMenus: {
            where: {
              startDate: { lte: today },
              OR: [{ endDate: null }, { endDate: { gte: today } }],
            },
            take: 1,
            orderBy: { startDate: "desc" },
          },
        },
      }),
      prisma.meal.findMany({ orderBy: { id: "asc" } }),
      prisma.kidCount.findMany({ where: { date: { in: upcomingDates } } }),
      prisma.milkCount.findMany({ where: { date: { in: upcomingDates } } }),
      prisma.foodItem.count(),
      prisma.menu.count(),
      prisma.billingRun.findFirst({ orderBy: { deliveryDate: "desc" } }),
      prisma.schoolClosing.findMany({
        where: { startDate: { lte: upcomingDates[upcomingDates.length - 1] }, endDate: { gte: upcomingDates[0] } },
      }),
    ]);

  const closedIds = new Set(closings.map((c) => c.schoolId));

  // Schools delivering on any of the upcoming dates
  const deliveringSchoolIds = new Set(
    upcomingDates.flatMap((date) =>
      allSchools
        .filter((s) => s.schoolMenus.length > 0 && schoolDeliversOn(s, date) && !closedIds.has(s.id))
        .map((s) => s.id)
    )
  );
  const deliveringSchools = allSchools.filter((s) => deliveringSchoolIds.has(s.id));

  // Kid count slots = delivering schools × meals × dates (deduplicated by school-meal across dates)
  const expectedKidSlots = deliveringSchools.length * meals.length * upcomingDates.length;
  const filledKidSlots = new Set(
    upcomingKidCounts
      .filter((kc) => deliveringSchoolIds.has(kc.schoolId))
      .map((kc) => `${kc.schoolId}-${kc.mealId}-${kc.date.toISOString()}`)
  ).size;
  const totalKids = upcomingKidCounts
    .filter((kc) => deliveringSchoolIds.has(kc.schoolId))
    .reduce((sum, kc) => sum + kc.count, 0);

  // Milk count slots = delivering schools × meals × dates
  const expectedMilkSlots = deliveringSchools.length * meals.length * upcomingDates.length;
  const filledMilkSlots = new Set(
    upcomingMilkCounts
      .filter((mc) => deliveringSchoolIds.has(mc.schoolId))
      .map((mc) => `${mc.schoolId}-${mc.mealId}-${mc.date.toISOString()}`)
  ).size;
  const totalMilk = upcomingMilkCounts
    .filter((mc) => deliveringSchoolIds.has(mc.schoolId))
    .reduce((sum, mc) => sum + mc.count, 0);

  const todayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dow = today.getDay();
  const isWeekend = dow === 0 || dow === 5 || dow === 6;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session?.user?.name ?? "there"}</h1>
        <p className="text-muted-foreground">{todayLabel}</p>
      </div>

      {/* Upcoming production window */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Counts needed for
          </h2>
          <span className="text-sm font-semibold text-foreground">{upcomingLabel}</span>
          {isWeekend && (
            <span className="text-xs text-muted-foreground">(production already ran — prep for next week)</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<School className="size-5" />}
            label="Schools in window"
            value={deliveringSchools.length}
            sub={`of ${allSchools.length} active`}
            color="blue"
          />
          <StatCard
            icon={<ClipboardList className="size-5" />}
            label="Kid Count Slots"
            value={`${filledKidSlots} / ${expectedKidSlots}`}
            sub={`${totalKids.toLocaleString()} kids total`}
            color={expectedKidSlots > 0 && filledKidSlots >= expectedKidSlots ? "green" : "amber"}
            complete={expectedKidSlots > 0 && filledKidSlots >= expectedKidSlots}
          />
          <StatCard
            icon={<Milk className="size-5" />}
            label="Milk Count Slots"
            value={`${filledMilkSlots} / ${expectedMilkSlots}`}
            sub={`${totalMilk.toLocaleString()} milks total`}
            color={expectedMilkSlots > 0 && filledMilkSlots >= expectedMilkSlots ? "green" : "amber"}
            complete={expectedMilkSlots > 0 && filledMilkSlots >= expectedMilkSlots}
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Last Billing Run"
            value={
              lastBillingRun
                ? new Date(lastBillingRun.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "None"
            }
            sub={lastBillingRun ? "most recent run" : "no runs yet"}
            color="purple"
          />
        </div>
      </div>

      {/* Catalog */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Catalog</h2>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <StatCard icon={<Building2 className="size-5" />} label="Active Schools" value={allSchools.length} color="slate" small />
          <StatCard icon={<UtensilsCrossed className="size-5" />} label="Food Items" value={foodItemCount} color="slate" small />
          <StatCard icon={<ClipboardList className="size-5" />} label="Menus" value={menuCount} color="slate" small />
        </div>
      </div>
    </div>
  );
}

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950/30",     icon: "text-blue-600 dark:text-blue-400",     border: "border-blue-100 dark:border-blue-900" },
  green:  { bg: "bg-green-50 dark:bg-green-950/30",   icon: "text-green-600 dark:text-green-400",   border: "border-green-100 dark:border-green-900" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-950/30",   icon: "text-amber-600 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-900" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/30", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-100 dark:border-purple-900" },
  slate:  { bg: "bg-muted/40",                         icon: "text-muted-foreground",                 border: "border-border" },
};

function StatCard({
  icon, label, value, sub, color = "slate", complete = false, small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: keyof typeof colorMap;
  complete?: boolean;
  small?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className={c.icon}>{icon}</span>
        {complete && <CheckCircle2 className="size-4 text-green-500" />}
      </div>
      <div>
        <p className={`font-bold leading-none ${small ? "text-xl" : "text-2xl"}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
