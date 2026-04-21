import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { buildWorkbook, workbookToBuffer, xlsxResponse, SheetDef } from "@/lib/excel";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const groupIdParam = searchParams.get("groupId");
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const startStr = startParam ?? new Date(Date.now() - 90 * 864e5).toISOString().split("T")[0];
  const endStr = endParam ?? new Date().toISOString().split("T")[0];
  const selectedGroupId = groupIdParam ? Number(groupIdParam) : null;

  const startDate = new Date(startStr + "T00:00:00");
  const endDate = new Date(endStr + "T23:59:59");

  const runs = await prisma.paperProductionRun.findMany({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(selectedGroupId ? { paperGroupId: selectedGroupId } : {}),
    },
    include: {
      group: true,
      amounts: {
        include: { school: true, paper: true, paperSize: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // ─── Sheet 1: Run History ─────────────────────────────────────────────────

  const runHistoryRows = runs.map((run) => {
    const schoolCount = new Set(run.amounts.map((a) => a.schoolId)).size;
    const total = run.amounts.reduce((s, a) => s + a.totalQty, 0);
    return {
      startDate: new Date(run.startDate),
      endDate: new Date(run.endDate),
      group: run.group?.name ?? "",
      schools: schoolCount,
      totalItems: total,
    };
  });

  const runHistorySheet: SheetDef = {
    name: "Run History",
    columns: [
      { header: "Start Date", key: "startDate", width: 14, numFmt: "mmm d yyyy" },
      { header: "End Date",   key: "endDate",   width: 14, numFmt: "mmm d yyyy" },
      { header: "Group",      key: "group",      width: 22 },
      { header: "Schools",    key: "schools",    width: 10, align: "right", numFmt: "#,##0" },
      { header: "Total Items", key: "totalItems", width: 14, align: "right", numFmt: "#,##0" },
    ],
    rows: runHistoryRows,
    totalsRow: {
      startDate: "",
      endDate: "TOTAL",
      group: "",
      schools: "",
      totalItems: runHistoryRows.reduce((s, r) => s + (r.totalItems as number), 0),
    },
  };

  // ─── Sheet 2: Totals by Item ──────────────────────────────────────────────

  type ItemKey = string;
  const itemTotals = new Map<ItemKey, { paperName: string; sizeName: string; totalQty: number }>();

  for (const run of runs) {
    for (const a of run.amounts) {
      const k: ItemKey = `${a.paperId}-${a.paperSizeId ?? 0}`;
      const existing = itemTotals.get(k);
      const sizeName = a.paperSize?.name ?? "—";
      if (existing) {
        existing.totalQty += a.totalQty;
      } else {
        itemTotals.set(k, { paperName: a.paper.name, sizeName, totalQty: a.totalQty });
      }
    }
  }

  const itemRows = [...itemTotals.values()].sort((a, b) =>
    a.paperName.localeCompare(b.paperName) || a.sizeName.localeCompare(b.sizeName)
  );
  const itemGrandTotal = itemRows.reduce((s, r) => s + r.totalQty, 0);

  const itemTotalsSheet: SheetDef = {
    name: "Totals by Item",
    columns: [
      { header: "Paper Item", key: "paperName", width: 26 },
      { header: "Size",       key: "sizeName",  width: 18 },
      { header: "Total Qty",  key: "totalQty",  width: 12, align: "right", numFmt: "#,##0" },
    ],
    rows: itemRows,
    totalsRow: { paperName: "TOTAL", sizeName: "", totalQty: itemGrandTotal },
  };

  // ─── Sheet 3: By School ───────────────────────────────────────────────────

  const schoolTotals = new Map<number, { schoolName: string; totalQty: number }>();

  for (const run of runs) {
    for (const a of run.amounts) {
      const existing = schoolTotals.get(a.schoolId);
      if (existing) {
        existing.totalQty += a.totalQty;
      } else {
        schoolTotals.set(a.schoolId, { schoolName: a.school.name, totalQty: a.totalQty });
      }
    }
  }

  const schoolRows = [...schoolTotals.values()].sort((a, b) =>
    a.schoolName.localeCompare(b.schoolName)
  );
  const schoolGrandTotal = schoolRows.reduce((s, r) => s + r.totalQty, 0);

  const bySchoolSheet: SheetDef = {
    name: "By School",
    columns: [
      { header: "School",    key: "schoolName", width: 30 },
      { header: "Total Qty", key: "totalQty",   width: 12, align: "right", numFmt: "#,##0" },
    ],
    rows: schoolRows,
    totalsRow: { schoolName: "TOTAL", totalQty: schoolGrandTotal },
  };

  // ─── Build and return ─────────────────────────────────────────────────────

  const wb = buildWorkbook([runHistorySheet, itemTotalsSheet, bySchoolSheet]);
  const buffer = await workbookToBuffer(wb);
  const filename = `paper-report-${startStr}-to-${endStr}.xlsx`;

  return xlsxResponse(buffer, filename);
}
