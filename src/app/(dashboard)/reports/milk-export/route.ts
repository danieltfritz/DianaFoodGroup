import { NextRequest } from "next/server";
import type ExcelJS from "exceljs";
import { parseLocalDate } from "@/lib/cycle";
import { getMilkCountReport, type MilkCountReportData, type MilkCountColumn } from "@/lib/reports";
import { createWorkbook, addRawSheet, workbookToBuffer, xlsxResponse, SHEET_STYLES } from "@/lib/excel";

function buildMilkSheet(
  ws: ExcelJS.Worksheet,
  data: MilkCountReportData,
  routeFilter: number | null | "all"
): void {
  const { bold, headerFill, borderTop } = SHEET_STYLES;
  const { columns, routes, grandTotals } = data;

  const filteredRoutes = routeFilter === "all"
    ? routes
    : routes.filter((r) => r.routeId === routeFilter);

  ws.getColumn(1).width = 36;
  for (let i = 0; i < columns.length; i++) ws.getColumn(2 + i).width = 14;
  ws.getColumn(2 + columns.length).width = 10;

  let r = 1;

  const writeHeader = (row: number) => {
    const nameRow = ws.getRow(row);
    nameRow.getCell(1).value = "School";
    columns.forEach((col: MilkCountColumn, i: number) => {
      nameRow.getCell(2 + i).value = col.name;
    });
    nameRow.getCell(2 + columns.length).value = "Total";
    nameRow.eachCell((cell) => { cell.font = bold; cell.fill = headerFill; });
    nameRow.commit();

    const colorRow = ws.getRow(row + 1);
    colorRow.getCell(1).value = "";
    columns.forEach((col: MilkCountColumn, i: number) => {
      colorRow.getCell(2 + i).value = col.labelColor;
    });
    colorRow.eachCell((cell) => { cell.fill = headerFill; });
    colorRow.commit();

    return row + 2;
  };

  r = writeHeader(r);

  for (const route of filteredRoutes) {
    for (const school of route.schools) {
      const schoolTotal = Object.values(school.counts).reduce((s, v) => s + v, 0);
      const dataRow = ws.getRow(r++);
      dataRow.getCell(1).value = school.schoolName;
      columns.forEach((col: MilkCountColumn, i: number) => {
        dataRow.getCell(2 + i).value = school.counts[col.milkTypeId] || null;
      });
      dataRow.getCell(2 + columns.length).value = schoolTotal || null;
      dataRow.commit();
    }

    const routeTotal = Object.values(route.totals).reduce((s, v) => s + v, 0);
    const totalsRow = ws.getRow(r++);
    totalsRow.getCell(1).value = `Route: ${route.routeName}`;
    columns.forEach((col: MilkCountColumn, i: number) => {
      totalsRow.getCell(2 + i).value = route.totals[col.milkTypeId] || null;
    });
    totalsRow.getCell(2 + columns.length).value = routeTotal || null;
    totalsRow.font = bold;
    totalsRow.border = borderTop;
    totalsRow.commit();

    r++;
  }

  if (routeFilter === "all") {
    const grandTotal = Object.values(grandTotals).reduce((s, v) => s + v, 0);
    const grandRow = ws.getRow(r++);
    grandRow.getCell(1).value = "Totals:";
    columns.forEach((col: MilkCountColumn, i: number) => {
      grandRow.getCell(2 + i).value = grandTotals[col.milkTypeId] || null;
    });
    grandRow.getCell(2 + columns.length).value = grandTotal || null;
    grandRow.font = bold;
    grandRow.border = borderTop;
    grandRow.commit();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = dateParam ? parseLocalDate(dateParam) : today;
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");

  const data = await getMilkCountReport(date);

  const wb = createWorkbook();

  addRawSheet(wb, "Milk Summary", (ws) => buildMilkSheet(ws, data, "all"));

  const usedNames = new Set<string>(["Milk Summary"]);
  for (const route of data.routes) {
    let name = `Route ${route.routeName}`.substring(0, 31);
    if (usedNames.has(name)) {
      name = `Route ${route.routeName} (${route.routeId})`.substring(0, 31);
    }
    usedNames.add(name);
    addRawSheet(wb, name, (ws) => buildMilkSheet(ws, data, route.routeId));
  }

  const buffer = await workbookToBuffer(wb);
  return xlsxResponse(buffer, `${dateStr}_Milk.xlsx`);
}
