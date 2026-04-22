"use server";

import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/cycle";

export type AgeGroupMap = { csvName: string; dbId: number; dbName: string };

export type ImportKidCountsResult = {
  date: string;
  processed: number;
  skipped: number;
  unmatched: { name: string; reason: string }[];
  errors: string[];
  ageGroupMapping: AgeGroupMap[];
};

export type DiagnosticResult = {
  date: string;
  totalRecords: number;
  schools: { schoolName: string; records: number }[];
  ageGroups: { id: number; name: string }[];
};

export async function diagnoseKidCounts(
  _prev: DiagnosticResult | null,
  formData: FormData
): Promise<DiagnosticResult> {
  const dateStr = (formData.get("date") as string | null)?.trim() ?? "";
  if (!dateStr) return { date: "", totalRecords: 0, schools: [], ageGroups: [] };

  const date = parseLocalDate(dateStr);

  const [records, ageGroups] = await Promise.all([
    prisma.kidCount.findMany({
      where: { date },
      include: { school: { select: { name: true } } },
    }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
  ]);

  const schoolCounts = new Map<string, number>();
  for (const r of records) {
    const name = r.school.name;
    schoolCounts.set(name, (schoolCounts.get(name) ?? 0) + 1);
  }

  return {
    date: dateStr,
    totalRecords: records.length,
    schools: Array.from(schoolCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([schoolName, records]) => ({ schoolName, records })),
    ageGroups,
  };
}

// CSV column layout per row:
// [0] School Name
// [1] BreakfastMenu  [2] "Breakfast"  [3-7] age group counts
// [8] LunchMenu      [9] "Lunch"      [10-14] age group counts
// [15] "Snack"       [16-20] age group counts
// [21] "Dinner"      [22-26] age group counts
const MEAL_SECTIONS = [
  { mealName: "Breakfast", menuColIdx: 1, countStart: 3 },
  { mealName: "Lunch",     menuColIdx: 8, countStart: 10 },
  { mealName: "Snack",     menuColIdx: 8, countStart: 16 },
  { mealName: "Dinner",    menuColIdx: 8, countStart: 22 },
] as const;

const CSV_AGE_COL_NAMES = ["Infants", "Infants2", "Small Kids", "Large Kids", "Small Kids3"];

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function importKidCounts(
  _prev: ImportKidCountsResult | null,
  formData: FormData
): Promise<ImportKidCountsResult> {
  const dateStr = (formData.get("date") as string | null)?.trim() ?? "";
  const file = formData.get("csv") as File | null;

  const blank: ImportKidCountsResult = {
    date: dateStr,
    processed: 0,
    skipped: 0,
    unmatched: [],
    errors: ["Date and CSV file are required."],
    ageGroupMapping: [],
  };

  if (!dateStr || !file) return blank;

  const csvText = await file.text();
  if (!csvText.trim()) return { ...blank, errors: ["CSV file is empty."] };

  const date = parseLocalDate(dateStr);

  const [schools, meals, ageGroups] = await Promise.all([
    prisma.school.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Map the 5 CSV age columns to DB age groups by id order, excluding "Adults"
  // The CSV has 5 columns; the DB may have 6 if Adults is included (always 0 in delivery)
  const mappedAgeGroups = ageGroups.filter((ag) => !ag.name.toLowerCase().includes("adult")).slice(0, 5);
  const ageGroupMapping: AgeGroupMap[] = CSV_AGE_COL_NAMES.map((csvName, i) => ({
    csvName,
    dbId: mappedAgeGroups[i]?.id ?? -1,
    dbName: mappedAgeGroups[i]?.name ?? "?",
  }));

  const mealById = new Map(meals.map((m) => [m.name.toLowerCase(), m]));
  const schoolByExact = new Map(schools.map((s) => [s.name, s]));
  const schoolByNorm = new Map(schools.map((s) => [normalizeName(s.name), s]));

  const findSchool = (name: string) =>
    schoolByExact.get(name) ?? schoolByNorm.get(normalizeName(name));

  // Load all active SchoolMenus for the date, grouped by schoolId
  const schoolMenus = await prisma.schoolMenu.findMany({
    where: {
      startDate: { lte: date },
      OR: [{ endDate: null }, { endDate: { gte: date } }],
    },
    include: { menu: true },
  });
  const menusBySchool = new Map<number, typeof schoolMenus>();
  for (const sm of schoolMenus) {
    if (!menusBySchool.has(sm.schoolId)) menusBySchool.set(sm.schoolId, []);
    menusBySchool.get(sm.schoolId)!.push(sm);
  }

  const findSchoolMenuId = (schoolId: number, menuName: string): number | null => {
    const list = menusBySchool.get(schoolId) ?? [];
    return (list.find((sm) => sm.menu.name === menuName) ?? list[0])?.id ?? null;
  };

  // Parse CSV — build op params first (no Prisma calls yet)
  type UpsertParams = {
    schoolId: number;
    schoolMenuId: number;
    date: Date;
    mealId: number;
    ageGroupId: number;
    count: number;
  };

  const lines = csvText.trim().split(/\r?\n/).slice(1); // skip header
  const unmatched: { name: string; reason: string }[] = [];
  const errors: string[] = [];
  // Use a Map to deduplicate by key — last value wins if CSV has duplicate rows
  const opMap = new Map<string, UpsertParams>();
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const schoolName = cols[0]?.trim() ?? "";
    const school = findSchool(schoolName);
    if (!school) {
      unmatched.push({ name: schoolName, reason: "Not found in database" });
      continue;
    }

    for (const section of MEAL_SECTIONS) {
      const menuName = cols[section.menuColIdx]?.trim() ?? "";
      const meal = mealById.get(section.mealName.toLowerCase());
      if (!meal) continue;

      const schoolMenuId = findSchoolMenuId(school.id, menuName);
      if (!schoolMenuId) {
        errors.push(`${schoolName} — ${section.mealName}: no active SchoolMenu found`);
        continue;
      }

      for (let i = 0; i < mappedAgeGroups.length; i++) {
        const ag = mappedAgeGroups[i];
        const count = parseInt(cols[section.countStart + i] ?? "0", 10) || 0;

        if (count === 0) {
          skipped++;
          continue;
        }

        const key = `${school.id}-${meal.id}-${ag.id}`;
        opMap.set(key, { schoolId: school.id, schoolMenuId, date, mealId: meal.id, ageGroupId: ag.id, count });
      }
    }
  }

  const opList = Array.from(opMap.values());

  // Interactive transaction — sequential upserts so each sees the previous result
  if (opList.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const p of opList) {
        await tx.kidCount.upsert({
          where: {
            schoolId_date_mealId_ageGroupId: {
              schoolId: p.schoolId,
              date: p.date,
              mealId: p.mealId,
              ageGroupId: p.ageGroupId,
            },
          },
          create: p,
          update: { count: p.count, schoolMenuId: p.schoolMenuId },
        });
      }
    });
  }

  return {
    date: dateStr,
    processed: opList.length,
    skipped,
    unmatched,
    errors,
    ageGroupMapping,
  };
}
