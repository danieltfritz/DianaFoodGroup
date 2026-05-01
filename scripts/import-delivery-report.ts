/**
 * One-time import script: DeliveryReport.csv → KidCount table
 *
 * Usage:
 *   npx tsx scripts/import-delivery-report.ts --file /path/to/DeliveryReport.csv
 *
 * Options:
 *   --file   Path to DeliveryReport.csv (default: ../Reports/DeliveryReport.csv)
 *   --dry    Dry run: print what would be imported without writing to DB
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// CSV column layout (0-indexed):
//  0: School Name
//  1: BreakfastMenu  2: "Breakfast"  3-7:  age group counts (5 cols)
//  8: LunchMenu      9: "Lunch"      10-14: age group counts (5 cols)
// 15: "Snack"                        16-20: age group counts (5 cols)  ← uses LunchMenu
// 21: "Dinner"                       22-26: age group counts (5 cols)  ← uses LunchMenu
const MEAL_SECTIONS = [
  { mealName: "Breakfast", menuColIdx: 1,  countStart: 3  },
  { mealName: "Lunch",     menuColIdx: 8,  countStart: 10 },
  { mealName: "Snack",     menuColIdx: 8,  countStart: 16 },
  { mealName: "Dinner",    menuColIdx: 8,  countStart: 22 },
] as const;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    file: get("--file") ?? path.join(__dirname, "../../Reports/DeliveryReport.csv"),
    dry: args.includes("--dry"),
  };
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

async function main() {
  const { file, dry } = parseArgs();

  if (!fs.existsSync(file)) {
    console.error(`Error: file not found: ${file}`);
    process.exit(1);
  }

  // Use today's date to find active school menus
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`\nDeliveryReport import`);
  console.log(`  File : ${file}`);
  console.log(`  Mode : ${dry ? "DRY RUN (no writes)" : "LIVE"}\n`);

  // ── Load reference data ─────────────────────────────────────────────────────
  const [schools, meals, ageGroups, schoolMenus] = await Promise.all([
    prisma.school.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.meal.findMany({ orderBy: { id: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { id: "asc" } }),
    prisma.schoolMenu.findMany({
      where: {
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: { menu: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Age groups: exclude Adults, take first 5 by id — matches CSV column order
  const mappedAgeGroups = ageGroups
    .filter((ag) => !ag.name.toLowerCase().includes("adult"))
    .slice(0, 5);

  console.log("Age group mapping:");
  ["Infants", "Infants2", "Small Kids", "Large Kids", "Small Kids3"].forEach((csvCol, i) => {
    const ag = mappedAgeGroups[i];
    console.log(`  CSV col "${csvCol}" → DB id=${ag?.id} "${ag?.name ?? "NOT FOUND"}"`);
  });
  console.log();

  const mealByName = new Map(meals.map((m) => [m.name.toLowerCase(), m]));
  const schoolByExact = new Map(schools.map((s) => [s.name, s]));
  const schoolByNorm  = new Map(schools.map((s) => [normalizeName(s.name), s]));
  const findSchool = (name: string) =>
    schoolByExact.get(name) ?? schoolByNorm.get(normalizeName(name));

  // Index active school menus: schoolId → latest SchoolMenu
  const activeMenuBySchool = new Map<number, typeof schoolMenus[0]>();
  for (const sm of schoolMenus) {
    if (!activeMenuBySchool.has(sm.schoolId)) {
      activeMenuBySchool.set(sm.schoolId, sm);
    }
  }

  const findSchoolMenuId = (schoolId: number, menuName: string) => {
    const sm = activeMenuBySchool.get(schoolId);
    if (!sm) return null;
    if (sm.menu.name === menuName || !menuName) return sm.id;
    // fallback: use whatever active menu the school has
    return sm.id;
  };

  // ── Parse CSV ───────────────────────────────────────────────────────────────
  const csvText = fs.readFileSync(file, "utf-8");
  const lines = csvText.trim().split(/\r?\n/).slice(1);

  type Row = { schoolId: number; schoolMenuId: number; mealId: number; ageGroupId: number; count: number };
  const rowMap = new Map<string, Row>();
  const unmatched: string[] = [];
  const noMenu: string[] = [];
  let zeroSkipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const schoolName = cols[0]?.trim() ?? "";
    const school = findSchool(schoolName);

    if (!school) {
      unmatched.push(schoolName);
      continue;
    }

    for (const section of MEAL_SECTIONS) {
      const menuName = cols[section.menuColIdx]?.trim() ?? "";
      const meal = mealByName.get(section.mealName.toLowerCase());
      if (!meal) continue;

      const schoolMenuId = findSchoolMenuId(school.id, menuName);
      if (!schoolMenuId) {
        noMenu.push(`${schoolName} / ${section.mealName} (menu: "${menuName}")`);
        continue;
      }

      for (let i = 0; i < mappedAgeGroups.length; i++) {
        const ag = mappedAgeGroups[i];
        const count = parseInt(cols[section.countStart + i] ?? "0", 10) || 0;
        if (count === 0) { zeroSkipped++; continue; }

        const key = `${schoolMenuId}-${meal.id}-${ag.id}`;
        rowMap.set(key, { schoolId: school.id, schoolMenuId, mealId: meal.id, ageGroupId: ag.id, count });
      }
    }
  }

  const rows = Array.from(rowMap.values());

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`Parsed ${lines.length} CSV rows`);
  console.log(`  Records to insert : ${rows.length}`);
  console.log(`  Zero counts skipped: ${zeroSkipped}`);

  if (unmatched.length > 0) {
    console.log(`\nUnmatched schools (${unmatched.length}) — skipped:`);
    unmatched.forEach((n) => console.log(`  - ${n}`));
  }
  if (noMenu.length > 0) {
    console.log(`\nNo active SchoolMenu found for (${noMenu.length}):`);
    noMenu.forEach((n) => console.log(`  - ${n}`));
  }

  if (dry) {
    console.log("\nDry run complete — no changes written.");
    return;
  }

  // ── Write to DB ─────────────────────────────────────────────────────────────
  console.log(`\nWriting to database…`);
  await prisma.$transaction(async (tx) => {
    // Clear all existing kid counts for the affected school menus
    const affectedMenuIds = [...new Set(rows.map((r) => r.schoolMenuId))];
    const deleted = await tx.kidCount.deleteMany({
      where: { schoolMenuId: { in: affectedMenuIds } },
    });
    console.log(`  Deleted ${deleted.count} existing records for affected menus`);
    await tx.kidCount.createMany({ data: rows });
    console.log(`  Inserted ${rows.length} records`);
  });

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
