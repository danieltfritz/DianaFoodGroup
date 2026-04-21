import { NextRequest } from "next/server";
import type ExcelJS from "exceljs";
import { parseLocalDate } from "@/lib/cycle";
import { getDeliveryTickets, type DeliveryTicket } from "@/lib/reports";
import { createWorkbook, addRawSheet, workbookToBuffer, xlsxResponse, SHEET_STYLES } from "@/lib/excel";

const COL_QTY = 1;
const COL_CONTAINER = 2;
const COL_DESC = 3;
const COL_SPACER = 4;
// Age group columns start at 5, count = ageGroups.length
// After age groups: Time, Packing, Receiving

function sectionLabel(mealName: string, tempType: string): string {
  const lower = mealName.toLowerCase();
  if (lower.includes("lunch")) return tempType === "hot" ? "Lunch Items - Hot" : "Lunch Items - Cold";
  if (lower.includes("snack") || lower.includes("pm")) return "Afternoon Snack";
  if (lower.includes("breakfast") || lower.includes("am")) return "Next Day Breakfast";
  return `${mealName}${tempType === "hot" ? " - Hot" : tempType === "cold" ? " - Cold" : ""}`;
}

function sectionOrder(mealName: string, tempType: string): number {
  const lower = mealName.toLowerCase();
  if (lower.includes("lunch")) return tempType === "hot" ? 0 : 1;
  if (lower.includes("snack") || lower.includes("pm")) return 2;
  if (lower.includes("breakfast") || lower.includes("am")) return 3;
  return 99;
}

function buildTicketSheet(ws: ExcelJS.Worksheet, ticket: DeliveryTicket, dateStr: string): void {
  const { bold, headerFill } = SHEET_STYLES;
  const { ageGroups, mealCounts, items, milkItems } = ticket;

  const colTime = COL_SPACER + 1 + ageGroups.length;
  const colPacking = colTime + 1;
  const colReceiving = colPacking + 1;

  // Column widths
  ws.getColumn(COL_QTY).width = 6;
  ws.getColumn(COL_CONTAINER).width = 10;
  ws.getColumn(COL_DESC).width = 27;
  ws.getColumn(COL_SPACER).width = 15;
  for (let i = 0; i < ageGroups.length; i++) ws.getColumn(5 + i).width = 5;
  ws.getColumn(colTime).width = 11;
  ws.getColumn(colPacking).width = 11;
  ws.getColumn(colReceiving).width = 13;

  let r = 1;
  r += 5; // rows 1-6 blank

  // Row 7: Driver label
  ws.getCell(r, colTime).value = "Driver Name";
  ws.getCell(r, colTime).font = bold;
  r++;

  // Row 8: Driver value
  ws.getCell(r, colTime).value = ticket.driverName ?? "";
  r++;

  // Row 9: Group
  ws.getCell(r, COL_CONTAINER).value = "Group:";
  ws.getCell(r, COL_CONTAINER).font = bold;
  ws.getCell(r, COL_DESC).value = ticket.billingGroupName ?? "";
  r++;

  // Row 10: Lunch Menu
  ws.getCell(r, COL_CONTAINER).value = "Lunch Menu:";
  ws.getCell(r, COL_CONTAINER).font = bold;
  ws.getCell(r, COL_DESC).value = ticket.menuName ?? "";
  r++;

  // Row 11: Route + Breakfast Menu + Age group labels + Totals
  ws.getCell(r, COL_QTY).value = "Route:";
  ws.getCell(r, COL_QTY).font = bold;
  ws.getCell(r, COL_CONTAINER).value = ticket.routeName ? `${ticket.routeName}${ticket.driverName ? ` - ${ticket.driverName}` : ""}` : "";
  ws.getCell(r, COL_DESC).value = "Date:";
  ws.getCell(r, COL_DESC).font = bold;
  ws.getCell(r, COL_SPACER).value = dateStr;
  ageGroups.forEach((ag, i) => {
    ws.getCell(r, 5 + i).value = ag.name;
    ws.getCell(r, 5 + i).font = bold;
  });
  ws.getCell(r, colTime).value = "Totals";
  ws.getCell(r, colTime).font = bold;
  r++;

  // Row 12: School + meal counts (one row per meal)
  const mealRows = [...mealCounts];
  mealRows.forEach((mc, idx) => {
    ws.getCell(r + idx, COL_QTY).value = idx === 0 ? "School:" : "";
    if (idx === 0) ws.getCell(r + idx, COL_QTY).font = bold;
    ws.getCell(r + idx, COL_CONTAINER).value = idx === 0 ? ticket.schoolName : "";
    if (idx === 0) ws.getCell(r + idx, COL_CONTAINER).font = bold;
    ws.getCell(r + idx, COL_DESC).value = idx === 1 ? ticket.address ?? "" : idx === 2 ? [ticket.city, ticket.postalCode].filter(Boolean).join(", ") : idx === 3 ? (ticket.phone ? `Phone: ${ticket.phone}` : "") : "";
    ws.getCell(r + idx, COL_SPACER).value = mc.mealName;
    ws.getCell(r + idx, COL_SPACER).font = bold;
    ageGroups.forEach((ag, i) => {
      ws.getCell(r + idx, 5 + i).value = mc.counts[ag.id] || null;
    });
    ws.getCell(r + idx, colTime).value = mc.total || null;
  });
  r += Math.max(mealRows.length, 4);

  r += 4; // blank rows 16-19

  // Row 20: Column headers
  const hRow = ws.getRow(r++);
  hRow.getCell(COL_QTY).value = "Qty";
  hRow.getCell(COL_CONTAINER).value = "Container";
  hRow.getCell(COL_DESC).value = "Description";
  ageGroups.forEach((ag, i) => {
    hRow.getCell(5 + i).value = ag.name;
  });
  hRow.getCell(colTime).value = "Time";
  hRow.getCell(colPacking).value = "Packing";
  hRow.getCell(colReceiving).value = "Receiving";
  hRow.eachCell((cell) => { cell.font = bold; cell.fill = headerFill; });
  hRow.commit();

  r++; // row 21 blank (sub-header placeholder)

  // Group items into sections
  const sectionMap = new Map<string, { order: number; items: typeof items }>();
  for (const item of items) {
    const label = sectionLabel(item.mealName, item.tempType);
    const order = sectionOrder(item.mealName, item.tempType);
    if (!sectionMap.has(label)) sectionMap.set(label, { order, items: [] });
    sectionMap.get(label)!.items.push(item);
  }
  const sections = Array.from(sectionMap.entries()).sort(([, a], [, b]) => a.order - b.order);

  r++; // blank before first section

  for (const [label, section] of sections) {
    // Section header
    ws.getCell(r, COL_DESC).value = label;
    ws.getCell(r, COL_DESC).font = bold;
    r++;

    r++; // blank after section header

    for (const item of section.items) {
      if (item.packs.length === 0) {
        const dataRow = ws.getRow(r++);
        dataRow.getCell(COL_QTY).value = null;
        dataRow.getCell(COL_CONTAINER).value = "—";
        dataRow.getCell(COL_DESC).value = item.foodName;
        item.servingSizes.forEach((ss, i) => {
          dataRow.getCell(5 + i).value = ss.display || null;
        });
        dataRow.getCell(colPacking).value = " - ";
        dataRow.getCell(colReceiving).value = " - ";
        dataRow.commit();
      } else {
        item.packs.forEach((pack, pi) => {
          const dataRow = ws.getRow(r++);
          dataRow.getCell(COL_QTY).value = pack.qty;
          dataRow.getCell(COL_CONTAINER).value = pack.containerName;
          dataRow.getCell(COL_DESC).value = item.foodName;
          if (pi === 0) {
            item.servingSizes.forEach((ss, i) => {
              dataRow.getCell(5 + i).value = ss.display || null;
            });
          }
          dataRow.getCell(colPacking).value = " - ";
          dataRow.getCell(colReceiving).value = " - ";
          dataRow.commit();
        });
      }
    }

    r++; // blank after section
  }

  // Milk section
  if (milkItems.length > 0) {
    ws.getCell(r, COL_CONTAINER).value = "Milk";
    ws.getCell(r, COL_CONTAINER).font = bold;
    r++;
    for (const m of milkItems) {
      const milkRow = ws.getRow(r++);
      milkRow.getCell(COL_QTY).value = m.qty;
      milkRow.getCell(COL_CONTAINER).value = m.milkTypeName;
      milkRow.commit();
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = dateParam ? parseLocalDate(dateParam) : today;
  const dateStr = date.toISOString().split("T")[0];
  const fileDateStr = dateStr.replace(/-/g, "");
  const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
  });

  const tickets = await getDeliveryTickets(date);

  const wb = createWorkbook();

  const usedNames = new Set<string>();
  for (const ticket of tickets) {
    let name = ticket.schoolName.substring(0, 31);
    if (usedNames.has(name)) {
      const suffix = ` (${ticket.schoolId})`;
      name = ticket.schoolName.substring(0, 31 - suffix.length) + suffix;
    }
    usedNames.add(name);
    addRawSheet(wb, name, (ws) => buildTicketSheet(ws, ticket, displayDate));
  }

  const buffer = await workbookToBuffer(wb);
  return xlsxResponse(buffer, `${fileDateStr}_DeliveryTickets.xlsx`);
}
