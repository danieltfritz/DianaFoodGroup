import { NextRequest } from "next/server";
import type ExcelJS from "exceljs";
import { parseLocalDate } from "@/lib/cycle";
import { getItemReport, type ItemReportSection } from "@/lib/reports";
import {
  createWorkbook,
  addRawSheet,
  workbookToBuffer,
  xlsxResponse,
  SHEET_STYLES,
} from "@/lib/excel";

function buildFoodSheet(ws: ExcelJS.Worksheet, section: ItemReportSection): void {
  const { foodName, tempType, pkUnit, containerName, containerSizes, rows, grandTotal } = section;
  const { bold, headerFill, borderTop } = SHEET_STYLES;

  // Column widths
  ws.getColumn(1).width = 42;
  for (let i = 0; i < containerSizes.length; i++) ws.getColumn(2 + i).width = 14;
  ws.getColumn(2 + containerSizes.length).width = 16;

  let r = 1;

  // ── Item info block ──────────────────────────────────────────────────────────
  const setLabel = (row: number, col: number, label: string, value: string) => {
    const labelCell = ws.getCell(row, col);
    labelCell.value = label;
    labelCell.font = bold;
    ws.getCell(row, col + 1).value = value;
  };

  setLabel(r++, 1, "Item:", foodName);
  setLabel(r++, 1, "Prep:", tempType === "hot" ? "Hot" : "Cold");
  r++; // blank

  if (containerName) {
    const containerHeaderRow = ws.getRow(r++);
    containerHeaderRow.getCell(1).value = "Container:";
    containerHeaderRow.getCell(1).font = bold;
    containerHeaderRow.getCell(2).value = containerName;
    if (containerSizes.length > 0) {
      containerHeaderRow.getCell(3).value = "Name";
      containerHeaderRow.getCell(3).font = bold;
      containerHeaderRow.getCell(4).value = "Size";
      containerHeaderRow.getCell(4).font = bold;
    }
    containerHeaderRow.commit();

    for (const size of containerSizes) {
      const sizeRow = ws.getRow(r++);
      sizeRow.getCell(3).value = size.name;
      sizeRow.getCell(4).value = size.size;
      sizeRow.commit();
    }
    r++; // blank
  }

  // ── Data header ──────────────────────────────────────────────────────────────
  const headerRow = ws.getRow(r++);
  headerRow.getCell(1).value = "School";
  containerSizes.forEach((size, i) => {
    headerRow.getCell(2 + i).value = size.name;
  });
  headerRow.getCell(2 + containerSizes.length).value = pkUnit ? `Total (${pkUnit})` : "Total";
  headerRow.eachCell((cell) => {
    cell.font = bold;
    cell.fill = headerFill;
  });
  headerRow.commit();

  // ── Data rows ────────────────────────────────────────────────────────────────
  const colTotals = containerSizes.map(() => 0);
  let fullContainers = 0;
  let partialContainers = 0;

  for (const row of rows) {
    const dataRow = ws.getRow(r++);
    dataRow.getCell(1).value = row.schoolName;

    containerSizes.forEach((size, i) => {
      const pack = row.packs.find((p) => p.containerSizeId === size.id);
      const cnt = pack?.count ?? 0;
      dataRow.getCell(2 + i).value = cnt || null;
      colTotals[i] += cnt;
    });

    dataRow.getCell(2 + containerSizes.length).value = Number(row.totalAmount.toFixed(4));
    dataRow.commit();

    for (const pack of row.packs) {
      if (pack.isPartial) partialContainers += pack.count;
      else fullContainers += pack.count;
    }
  }

  // ── Totals row ───────────────────────────────────────────────────────────────
  const totalsRow = ws.getRow(r++);
  totalsRow.getCell(1).value = "Totals";
  colTotals.forEach((total, i) => {
    totalsRow.getCell(2 + i).value = total || null;
  });
  totalsRow.getCell(2 + containerSizes.length).value = Number(grandTotal.toFixed(4));
  totalsRow.font = bold;
  totalsRow.border = borderTop;
  totalsRow.commit();

  r++; // blank

  // ── Summary block ─────────────────────────────────────────────────────────
  const totalLabel = pkUnit ? `Total (${pkUnit}):` : "Total:";
  ws.getCell(r, 1).value = totalLabel;
  ws.getCell(r, 1).font = bold;
  ws.getCell(r, 2).value = Number(grandTotal.toFixed(4));
  r++;

  r++; // blank

  ws.getCell(r, 1).value = "# of Full Containers:";
  ws.getCell(r, 1).font = bold;
  ws.getCell(r, 2).value = fullContainers;
  r++;

  ws.getCell(r, 1).value = "# of Partial Containers:";
  ws.getCell(r, 1).font = bold;
  ws.getCell(r, 2).value = partialContainers;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = dateParam ? parseLocalDate(dateParam) : today;
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");

  const sections = await getItemReport(date);

  const wb = createWorkbook();

  // Deduplicate sheet names (Excel limit: 31 chars, must be unique)
  const usedNames = new Set<string>();
  for (const section of sections) {
    let name = section.foodName.substring(0, 31);
    if (usedNames.has(name)) {
      const suffix = ` (${section.foodId})`;
      name = section.foodName.substring(0, 31 - suffix.length) + suffix;
    }
    usedNames.add(name);
    addRawSheet(wb, name, (ws) => buildFoodSheet(ws, section));
  }

  const buffer = await workbookToBuffer(wb);
  return xlsxResponse(buffer, `${dateStr}_FoodItems.xlsx`);
}
