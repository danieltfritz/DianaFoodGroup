import { NextRequest } from "next/server";
import type ExcelJS from "exceljs";
import { parseLocalDate } from "@/lib/cycle";
import { getDailyKidCountReport, type DailyKidCountReport } from "@/lib/reports";
import { createWorkbook, addRawSheet, workbookToBuffer, xlsxResponse, SHEET_STYLES } from "@/lib/excel";

function buildDailyCountsSheet(ws: ExcelJS.Worksheet, data: DailyKidCountReport): void {
  const { bold, headerFill, borderTop } = SHEET_STYLES;
  const { ageGroups, sections, grandTotals, grandTotal } = data;

  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 14;
  for (let i = 0; i < ageGroups.length; i++) ws.getColumn(3 + i).width = 14;
  ws.getColumn(3 + ageGroups.length).width = 12;

  let r = 1;

  // Header row
  const headerRow = ws.getRow(r++);
  headerRow.getCell(1).value = "";
  headerRow.getCell(2).value = "";
  ageGroups.forEach((ag, i) => {
    headerRow.getCell(3 + i).value = ag.name;
  });
  headerRow.getCell(3 + ageGroups.length).value = "Totals";
  headerRow.eachCell((cell) => { cell.font = bold; cell.fill = headerFill; });
  headerRow.commit();

  r++; // blank row after header (matches legacy layout)

  for (const section of sections) {
    // Meal rows
    let firstMeal = true;
    for (const meal of section.meals) {
      const dataRow = ws.getRow(r++);
      if (firstMeal) {
        dataRow.getCell(1).value = section.menuName;
        dataRow.getCell(1).font = bold;
        firstMeal = false;
      }
      dataRow.getCell(2).value = meal.mealName;
      ageGroups.forEach((ag, i) => {
        dataRow.getCell(3 + i).value = meal.counts[ag.id] || null;
      });
      dataRow.getCell(3 + ageGroups.length).value = meal.total || null;
      dataRow.commit();
    }

    // Totals row for this site
    const totalsRow = ws.getRow(r++);
    totalsRow.getCell(2).value = "Totals";
    ageGroups.forEach((ag, i) => {
      totalsRow.getCell(3 + i).value = section.totals[ag.id] || null;
    });
    totalsRow.getCell(3 + ageGroups.length).value = section.grandTotal || null;
    totalsRow.font = bold;
    totalsRow.border = borderTop;
    totalsRow.commit();

    r++; // blank separator
  }

  // Grand totals
  const grandRow = ws.getRow(r++);
  grandRow.getCell(1).value = "Totals";
  grandRow.getCell(1).font = bold;
  grandRow.getCell(2).value = "Breakfast";
  ageGroups.forEach((ag, i) => {
    grandRow.getCell(3 + i).value = grandTotals[ag.id] || null;
  });
  grandRow.getCell(3 + ageGroups.length).value = grandTotal || null;
  grandRow.font = bold;
  grandRow.border = borderTop;
  grandRow.commit();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = dateParam ? parseLocalDate(dateParam) : today;
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");

  const data = await getDailyKidCountReport(date);

  const wb = createWorkbook();
  addRawSheet(wb, "Daily Counts", (ws) => buildDailyCountsSheet(ws, data));

  const buffer = await workbookToBuffer(wb);
  return xlsxResponse(buffer, `${dateStr}_DailyKidCountReport.xlsx`);
}
