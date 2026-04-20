import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = "C:\\Users\\DanFritz\\source\\repos\\Diana\\PaperGoods\\Data";

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
      fields.push(cur); fields.push("\n"); cur = "";
    } else if (c === "," && !inQ) {
      fields.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  const rows: string[][] = [[]];
  for (const f of fields) {
    if (f === "\n") rows.push([]);
    else rows[rows.length - 1].push(f.trim());
  }
  const headers = rows[0].map((h) => h.trim()).filter((h) => h);
  return rows.slice(1)
    .filter((r) => r.some((v) => v.trim()))
    .filter((r) => r[0]?.trim())
    .map((r) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = (r[i] ?? "").trim();
      return obj;
    });
}

const int = (v: string | undefined) => parseInt(v ?? "0") || 0;
const nullStr = (v: string | undefined): string | null => (v ?? "").trim() || null;
const S = (v: string | null) => v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
const N = (v: number | null) => v == null ? "NULL" : String(v);

function log(msg: string) {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${msg}\n`);
}

async function withIdentity(table: string, sqls: string[]) {
  if (sqls.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < sqls.length; i += CHUNK) {
    const chunk = sqls.slice(i, i + CHUNK);
    const batch = [
      `SET IDENTITY_INSERT [dbo].[${table}] ON`,
      ...chunk,
      `SET IDENTITY_INSERT [dbo].[${table}] OFF`,
    ].join(";\n");
    await prisma.$executeRawUnsafe(batch);
  }
  await prisma.$executeRawUnsafe(`DBCC CHECKIDENT ('[dbo].[${table}]', RESEED)`);
}

async function batchInsert(sqls: string[]) {
  const CHUNK = 200;
  for (let i = 0; i < sqls.length; i += CHUNK) {
    await prisma.$executeRawUnsafe(sqls.slice(i, i + CHUNK).join(";\n"));
  }
}

async function importPaperItems() {
  const rows = parseCSV("PaperGoods.csv");
  log(`PaperItems: ${rows.length} rows`);
  await batchInsert(rows.map((r) =>
    `INSERT INTO [dbo].[PaperItem] (id, name, active) VALUES (${int(r["PaperId"])}, ${S(r["PaperName"] ?? "")}, 1)`
  ));
  log(`  ✓ done`);
  return new Set(rows.map((r) => int(r["PaperId"])));
}

async function importPaperSizes(validPaperIds: Set<number>) {
  const rows = parseCSV("PaperSize.csv");
  const valid = rows.filter((r) => validPaperIds.has(int(r["PaperId"])));
  log(`PaperSizes: ${valid.length} valid rows (${rows.length - valid.length} skipped — orphaned PaperId)`);
  await batchInsert(valid.map((r) =>
    `INSERT INTO [dbo].[PaperSize] (id, paperId, name) VALUES (${int(r["PaperSizeId"])}, ${int(r["PaperId"])}, ${S(nullStr(r["Size"]))})`
  ));
  log(`  ✓ done`);
  return new Set(valid.map((r) => int(r["PaperSizeId"])));
}

async function importPaperContainers(validPaperIds: Set<number>, validSizeIds: Set<number>) {
  const rows = parseCSV("PaperContainers.csv");
  const valid = rows.filter((r) =>
    validPaperIds.has(int(r["PaperId"])) && validSizeIds.has(int(r["PaperSizeId"]))
  );
  log(`PaperContainers: ${valid.length} valid rows (${rows.length - valid.length} skipped — orphaned FK)`);
  await batchInsert(valid.map((r) =>
    `INSERT INTO [dbo].[PaperContainer] (id, paperId, paperSizeId, containerName, containerSize) VALUES (${int(r["PaperContainerId"])}, ${int(r["PaperId"])}, ${int(r["PaperSizeId"])}, ${S(r["ContainerName"] ?? "")}, ${int(r["ContainerSize"])})`
  ));
  log(`  ✓ done`);
}

async function importPaperGroups() {
  const rows = parseCSV("PaperGroups.csv");
  const valid = rows.filter((r) => nullStr(r["PaperGroup"]));
  log(`PaperGroups: ${valid.length} valid rows (${rows.length - valid.length} skipped — empty name)`);
  await batchInsert(valid.map((r) =>
    `INSERT INTO [dbo].[PaperGroup] (id, name) VALUES (${int(r["PaperGroupId"])}, ${S(nullStr(r["PaperGroup"]))})`
  ));
  log(`  ✓ done`);
  return new Set(valid.map((r) => int(r["PaperGroupId"])));
}

async function importSchoolPaperGroups(validGroupIds: Set<number>) {
  const rows = parseCSV("PaperSchoolGroups.csv");
  const validSchoolIds = new Set(
    (await prisma.$queryRawUnsafe<{ id: number }[]>(`SELECT id FROM [dbo].[School]`)).map((r) => r.id)
  );
  const valid = rows.filter((r) =>
    validGroupIds.has(int(r["PaperGroupId"])) && validSchoolIds.has(int(r["SchoolId"]))
  );
  log(`SchoolPaperGroups: ${valid.length} valid rows (${rows.length - valid.length} skipped — orphaned FK)`);
  await batchInsert(valid.map((r) =>
    `INSERT INTO [dbo].[SchoolPaperGroup] (schoolId, paperGroupId) VALUES (${int(r["SchoolId"])}, ${int(r["PaperGroupId"])})`
  ));
  log(`  ✓ done`);
}

async function importSchoolPaperComments() {
  const rows = parseCSV("PaperComments.csv");
  const validSchoolIds = new Set(
    (await prisma.$queryRawUnsafe<{ id: number }[]>(`SELECT id FROM [dbo].[School]`)).map((r) => r.id)
  );
  const valid = rows.filter((r) =>
    nullStr(r["Comments"]) && validSchoolIds.has(int(r["SchoolId"]))
  );
  log(`SchoolPaperComments: ${valid.length} valid rows (${rows.length - valid.length} skipped — empty or orphaned)`);
  await batchInsert(valid.map((r) =>
    `INSERT INTO [dbo].[SchoolPaperComment] (schoolId, comment) VALUES (${int(r["SchoolId"])}, ${S(nullStr(r["Comments"]))})`
  ));
  log(`  ✓ done`);
}

async function main() {
  const mode = process.argv[2] ?? "pg1";

  if (mode === "pg1") {
    log("Starting paper goods PG1 import...");
    const existing = await prisma.paperItem.count().catch(() => 0);
    if (existing > 0) {
      console.error(`ERROR: PaperItem table already has ${existing} rows. Clear it first.`);
      process.exit(1);
    }
    const validPaperIds = await importPaperItems();
    const validSizeIds = await importPaperSizes(validPaperIds);
    await importPaperContainers(validPaperIds, validSizeIds);
    log("");
    log("PG1 import complete!");
    log(`  ${validPaperIds.size} paper items`);
    log(`  ${validSizeIds.size} paper sizes`);
  } else if (mode === "pg2") {
    log("Starting paper goods PG2 import...");
    const existingGroups = await prisma.paperGroup.count().catch(() => 0);
    if (existingGroups > 0) {
      console.error(`ERROR: PaperGroup table already has ${existingGroups} rows. Clear it first.`);
      process.exit(1);
    }
    const validGroupIds = await importPaperGroups();
    await importSchoolPaperGroups(validGroupIds);
    await importSchoolPaperComments();
    log("");
    log("PG2 import complete!");
  } else {
    console.error(`Unknown mode: ${mode}. Use pg1 or pg2.`);
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
