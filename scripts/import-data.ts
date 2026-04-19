import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = "C:\\Users\\DanFritz\\source\\repos\\Diana\\Data";

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(filename: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");

  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (inQ && raw[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if ((c === "\r" || c === "\n") && !inQ) {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      fields.push(cur);
      fields.push("\n");
      cur = "";
    } else if (c === "," && !inQ) {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);

  const rows: string[][] = [[]];
  for (const f of fields) {
    if (f === "\n") { rows.push([]); }
    else { rows[rows.length - 1].push(f.trim()); }
  }

  const headers = rows[0].map((h) => h.trim()).filter((h) => h);
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v.trim()))
    .filter((r) => r[0]?.trim())
    .map((r) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = (r[i] ?? "").trim();
      return obj;
    });
}

// ─── Value helpers ────────────────────────────────────────────────────────────

const bool = (v: string | undefined) => v?.toUpperCase() === "TRUE";
const str = (v: string | undefined) => (v ?? "").trim();
const nullStr = (v: string | undefined): string | null => str(v) || null;
const int = (v: string | undefined) => parseInt(v ?? "0") || 0;
const nullInt = (v: string | undefined): number | null => {
  if (!v?.trim()) return null;
  const n = parseInt(v);
  return isNaN(n) ? null : n;
};
const nullDec = (v: string | undefined): number | null => {
  if (!v?.trim()) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
function parseDate(v: string | undefined): Date | null {
  if (!v?.trim()) return null;
  const m = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (m) {
    const yy = parseInt(m[3]);
    return new Date(yy < 50 ? 2000 + yy : 1900 + yy, (MONTHS[m[2]] ?? 1) - 1, parseInt(m[1]));
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function log(msg: string) {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${msg}\n`);
}

// ─── SQL literal helpers (for raw batch strings) ──────────────────────────────

function S(v: string | null): string { return v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`; }
function N(v: number | null): string { return v == null ? "NULL" : String(v); }
function B(v: boolean): string { return v ? "1" : "0"; }
function D(v: Date | null): string {
  if (v == null) return "NULL";
  const y = v.getFullYear();
  const mo = String(v.getMonth() + 1).padStart(2, "0");
  const d = String(v.getDate()).padStart(2, "0");
  return `'${y}-${mo}-${d}'`;
}

// ─── IDENTITY_INSERT helper ───────────────────────────────────────────────────

async function withIdentity(table: string, insertSqls: string[]) {
  if (insertSqls.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < insertSqls.length; i += CHUNK) {
    const chunk = insertSqls.slice(i, i + CHUNK);
    const batch = [
      `SET IDENTITY_INSERT [dbo].[${table}] ON`,
      ...chunk,
      `SET IDENTITY_INSERT [dbo].[${table}] OFF`,
    ].join(";\n");
    await prisma.$executeRawUnsafe(batch);
  }
  await prisma.$executeRawUnsafe(`DBCC CHECKIDENT ('[dbo].[${table}]', RESEED)`);
}

// ─── Import functions ─────────────────────────────────────────────────────────

async function importCounties(): Promise<Map<string, number>> {
  const rows = parseCSV("County.csv");
  log(`Counties: ${rows.length} rows`);
  await withIdentity("County", rows.map((r) =>
    `INSERT INTO [dbo].[County] (id, name) VALUES (${int(r["C_ID"])}, ${S(str(r["County"]))})`
  ));
  const map = new Map<string, number>();
  for (const r of rows) map.set(str(r["County"]).toLowerCase(), int(r["C_ID"]));
  log(`  ✓ done`);
  return map;
}

async function importRoutes() {
  const rows = parseCSV("Routes.csv");
  log(`Routes: ${rows.length} rows`);
  await withIdentity("Route", rows.map((r) => {
    const name = nullStr(r["RouteName"]) ?? `Route ${r["Route"]}`;
    return `INSERT INTO [dbo].[Route] (id, name, driver) VALUES (${int(r["Route"])}, ${S(name)}, ${S(nullStr(r["Driver"]))})`;
  }));
  log(`  ✓ done`);
}

async function importAgeGroups() {
  const rows = parseCSV("AgeGroups.csv");
  log(`AgeGroups: ${rows.length} rows`);
  await withIdentity("AgeGroup", rows.map((r) =>
    `INSERT INTO [dbo].[AgeGroup] (id, name, startAge, endAge) VALUES (${int(r["AgeGroupId"])}, ${S(str(r["AgeGroupName"]))}, ${int(r["Starting Age"])}, ${int(r["Ending Age"])})`
  ));
  log(`  ✓ done`);
}

async function importMeals() {
  const rows = parseCSV("Meals.csv");
  log(`Meals: ${rows.length} rows`);
  await withIdentity("Meal", rows.map((r) =>
    `INSERT INTO [dbo].[Meal] (id, name) VALUES (${int(r["MealId"])}, ${S(str(r["Meal"]))})`
  ));
  log(`  ✓ done`);
}

async function importMenuTypes() {
  const rows = parseCSV("MenuType.csv");
  log(`MenuTypes: ${rows.length} rows`);
  await withIdentity("MenuType", rows.map((r) =>
    `INSERT INTO [dbo].[MenuType] (id, name) VALUES (${int(r["MenuTypeId"])}, ${S(str(r["MenuType"]))})`
  ));
  log(`  ✓ done`);
}

async function importFoodTypes() {
  const foodRows = parseCSV("Food.csv");
  const ids = [...new Set(foodRows.map((r) => int(r["FoodType"])).filter((n) => n > 0))].sort((a, b) => a - b);
  log(`FoodTypes: ${ids.length} unique IDs from Food.csv (placeholder names — rename in admin)`);
  if (ids.length === 0) return;
  await withIdentity("FoodType", ids.map((id) =>
    `INSERT INTO [dbo].[FoodType] (id, name) VALUES (${id}, ${S(`FoodType ${id}`)})`
  ));
  log(`  ✓ done — IDs: ${ids.join(", ")}`);
}

async function importBillingGroups() {
  const rows = parseCSV("BillingGroups.csv").filter((r) => str(r["BillingGroup"]));
  log(`BillingGroups: ${rows.length} rows`);
  if (rows.length === 0) return;
  await withIdentity("BillingGroup", rows.map((r) =>
    `INSERT INTO [dbo].[BillingGroup] (id, name) VALUES (${int(r["BillingGroupId"])}, ${S(str(r["BillingGroup"]))})`
  ));
  log(`  ✓ done`);
}

async function importContainers() {
  const rows = parseCSV("Containers.csv");
  log(`Containers: ${rows.length} rows`);
  await withIdentity("Container", rows.map((r) =>
    `INSERT INTO [dbo].[Container] (id, name, isVariable, allowPartial, menuTypeId, units) VALUES (${int(r["ContainerId"])}, ${S(str(r["Container Name"]))}, ${B(bool(r["ContainerVariable"]))}, ${B(bool(r["Partially Fillable"]))}, ${N(nullInt(r["MenuType"]))}, ${S(nullStr(r["Units"]))})`
  ));
  log(`  ✓ done`);
}

async function importContainerSizes() {
  const rows = parseCSV("ContainerSize.csv");
  log(`ContainerSizes: ${rows.length} rows`);
  await withIdentity("ContainerSize", rows.map((r) => {
    const abbr = nullStr(r["NameAbrv"]) ?? str(r["Name"]);
    return `INSERT INTO [dbo].[ContainerSize] (id, containerId, name, abbreviation, size) VALUES (${int(r["ContainerSizeId"])}, ${int(r["ContainerId"])}, ${S(str(r["Name"]))}, ${S(abbr)}, ${nullDec(r["Size"]) ?? 0})`;
  }));
  log(`  ✓ done`);
}

async function importFoodItems() {
  const rows = parseCSV("Food.csv");
  log(`FoodItems: ${rows.length} rows`);
  const validContainers = new Set(
    (await prisma.container.findMany({ select: { id: true } })).map((c) => c.id)
  );
  await withIdentity("FoodItem", rows.map((r) => {
    const cid = nullInt(r["ContainerId"]);
    const safeCid = cid != null && validContainers.has(cid) ? cid : null;
    return `INSERT INTO [dbo].[FoodItem] (id, name, tempType, foodTypeId, isMilk, hasLabel, showOnReport, menuTypeId, defaultContainerId, containerThreshold, pkSize, pkUnit) VALUES (${int(r["FoodId"])}, ${S(str(r["FoodName"]))}, ${S(str(r["FoodTemp"]).toLowerCase() || "cold")}, ${N(nullInt(r["FoodType"]))}, ${B(bool(r["MilkItem"]))}, ${B(bool(r["labels"]))}, ${B(bool(r["Report"]))}, ${N(nullInt(r["MenuType"]))}, ${N(safeCid)}, ${N(nullDec(r["ContainerThreshold"]))}, ${N(nullInt(r["PkSize"]))}, ${S(nullStr(r["pkUnit"]))})`;
  }));
  log(`  ✓ done`);
}

async function importSchools(countyMap: Map<string, number>) {
  const rows = parseCSV("Schools.csv");
  log(`Schools: ${rows.length} rows`);
  await withIdentity("School", rows.map((r) => {
    const countyId = countyMap.get(str(r["County"]).toLowerCase()) ?? null;
    return `INSERT INTO [dbo].[School] (id, name, address, city, state, postalCode, contactName, phone, email, fax, routeId, countyId, deliveryMon, deliveryTue, deliveryWed, deliveryThu, deliveryFri, deliverySat, deliverySun, notes, active, milkTier) VALUES (${int(r["SchoolId"])}, ${S(str(r["Name"]))}, ${S(nullStr(r["Address"]))}, ${S(nullStr(r["City"]))}, ${S(nullStr(r["State"]))}, ${S(nullStr(r["Zip Code"]))}, ${S(nullStr(r["Contact"]))}, ${S(nullStr(r["Phone Number"]))}, ${S(nullStr(r["Email"]))}, ${S(nullStr(r["Fax Number"]))}, ${N(nullInt(r["Route"]))}, ${N(countyId)}, ${B(bool(r["Monday"]))}, ${B(bool(r["Tuesday"]))}, ${B(bool(r["Wednesday"]))}, ${B(bool(r["Thursday"]))}, ${B(bool(r["Friday"]))}, ${B(bool(r["Saturday"]))}, ${B(bool(r["Sunday"]))}, ${S(nullStr(r["Notes"]))}, ${B(bool(r["IsActive"]))}, 'medium')`;
  }));
  log(`  ✓ done`);
}

async function importMenus() {
  const rows = parseCSV("Menus.csv");
  log(`Menus: ${rows.length} rows`);
  await withIdentity("Menu", rows.map((r) => {
    const effectiveDate = parseDate(r["EffectiveDate"]) ?? new Date("2000-01-01");
    return `INSERT INTO [dbo].[Menu] (id, name, cycleWeeks, effectiveDate, isBoxMenu, delaySnack) VALUES (${int(r["MenuId"])}, ${S(str(r["Name"]))}, ${int(r["Cycle"]) || 1}, ${D(effectiveDate)}, ${B(bool(r["BoxMenu"]))}, ${B(bool(r["DelaySnack"]))})`;
  }));
  log(`  ✓ done`);
}

async function importSchoolMenus() {
  const rows = parseCSV("SchoolMenus.csv");
  log(`SchoolMenus: ${rows.length} rows`);
  const [validSchools, validMenus] = await Promise.all([
    prisma.school.findMany({ select: { id: true } }).then((r) => new Set(r.map((s) => s.id))),
    prisma.menu.findMany({ select: { id: true } }).then((r) => new Set(r.map((m) => m.id))),
  ]);
  const valid = rows.filter((r) => validSchools.has(int(r["SchoolId"])) && validMenus.has(int(r["MenuId"])));
  log(`  ${rows.length - valid.length} rows skipped (orphaned school/menu FK)`);
  await withIdentity("SchoolMenu", valid.map((r) => {
    const startDate = parseDate(r["StartDate"]) ?? new Date("2000-01-01");
    const endDate = parseDate(r["EndDate"]);
    return `INSERT INTO [dbo].[SchoolMenu] (id, schoolId, menuId, startDate, endDate) VALUES (${int(r["SchoolMenusId"])}, ${int(r["SchoolId"])}, ${int(r["MenuId"])}, ${D(startDate)}, ${D(endDate)})`;
  }));
  log(`  ✓ done`);
}

async function importMenuItems() {
  const rows = parseCSV("MenuItem.csv");
  log(`MenuItems: ${rows.length} rows (no original IDs — using individual inserts)`);
  const [validMenus, validFood, validMeals] = await Promise.all([
    prisma.menu.findMany({ select: { id: true } }).then((r) => new Set(r.map((m) => m.id))),
    prisma.foodItem.findMany({ select: { id: true } }).then((r) => new Set(r.map((f) => f.id))),
    prisma.meal.findMany({ select: { id: true } }).then((r) => new Set(r.map((m) => m.id))),
  ]);
  const data = rows
    .map((r) => ({
      menuId: int(r["MenuId"]),
      foodItemId: int(r["FoodId"]),
      mealId: int(r["MealId"]),
      week: int(r["Week"]),
      dayId: int(r["DayId"]),
    }))
    .filter((r) => r.menuId && r.foodItemId && r.mealId && r.week && r.dayId)
    .filter((r) => validMenus.has(r.menuId) && validFood.has(r.foodItemId) && validMeals.has(r.mealId));

  let inserted = 0;
  let skipped = 0;
  for (const row of data) {
    try {
      await prisma.menuItem.create({ data: row });
      inserted++;
    } catch { skipped++; }
  }
  log(`  ✓ done — ${inserted} inserted, ${skipped} skipped`);
}

async function importServingSizes() {
  const rows = parseCSV("ServingSize.csv");
  log(`ServingSizes: ${rows.length} rows (no original IDs — using individual inserts)`);
  const [validMeals, validFood, validAgeGroups] = await Promise.all([
    prisma.meal.findMany({ select: { id: true } }).then((r) => new Set(r.map((m) => m.id))),
    prisma.foodItem.findMany({ select: { id: true } }).then((r) => new Set(r.map((f) => f.id))),
    prisma.ageGroup.findMany({ select: { id: true } }).then((r) => new Set(r.map((a) => a.id))),
  ]);
  const data = rows
    .map((r) => ({
      mealId: int(r["MealId"]),
      foodItemId: int(r["FoodId"]),
      ageGroupId: int(r["AgeGroupId"]),
      servingSize: nullDec(r["ServingSize"]) ?? 0,
    }))
    .filter((r) => r.mealId && r.foodItemId && r.ageGroupId && r.servingSize > 0)
    .filter((r) => validMeals.has(r.mealId) && validFood.has(r.foodItemId) && validAgeGroups.has(r.ageGroupId));

  let inserted = 0;
  let skipped = 0;
  for (const row of data) {
    try {
      await prisma.servingSize.create({ data: row });
      inserted++;
    } catch { skipped++; }
  }
  log(`  ✓ done — ${inserted} inserted, ${skipped} skipped`);
}

async function importSchoolClosings() {
  const rows = parseCSV("SchoolClosing.csv");
  const validSchools = await prisma.school.findMany({ select: { id: true } }).then((r) => new Set(r.map((s) => s.id)));
  const valid = rows.filter((r) =>
    parseDate(r["StartDate"]) && parseDate(r["EndDate"]) && validSchools.has(int(r["SchoolId"]))
  );
  log(`SchoolClosings: ${valid.length} valid rows (of ${rows.length})`);
  await withIdentity("SchoolClosing", valid.map((r) =>
    `INSERT INTO [dbo].[SchoolClosing] (id, schoolId, startDate, endDate) VALUES (${int(r["SchoolClosingsId"])}, ${int(r["SchoolId"])}, ${D(parseDate(r["StartDate"]))}, ${D(parseDate(r["EndDate"]))})`
  ));
  log(`  ✓ done`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("Starting data import...");

  const [schools, food] = await Promise.all([prisma.school.count(), prisma.foodItem.count()]);
  if (schools > 0 || food > 0) {
    console.error(`ERROR: Database already has data (${schools} schools, ${food} food items). Clear it first.`);
    process.exit(1);
  }

  const countyMap = await importCounties();
  await importRoutes();
  await importAgeGroups();
  await importMeals();
  await importMenuTypes();
  await importFoodTypes();
  await importBillingGroups();
  await importContainers();
  await importContainerSizes();
  await importFoodItems();
  await importSchools(countyMap);
  await importMenus();
  await importSchoolMenus();
  await importMenuItems();
  await importServingSizes();
  await importSchoolClosings();

  log("");
  log("Import complete!");
  log("FoodType rows have placeholder names — update them in Admin > Food Items.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
