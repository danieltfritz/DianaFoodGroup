import ExcelJS from "exceljs";

export type CellValue = string | number | Date | null | undefined;

export type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "right" | "center";
};

export type SheetDef = {
  name: string;
  columns: ColumnDef[];
  rows: Record<string, CellValue>[];
  totalsRow?: Record<string, CellValue>;
};

// ─── Style constants ──────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8E8E8" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11 };
const TOTALS_FONT: Partial<ExcelJS.Font> = { bold: true };
const TOTALS_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF999999" } },
};

// ─── Core builder ─────────────────────────────────────────────────────────────

export function buildWorkbook(sheets: SheetDef[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CCFP";
  wb.created = new Date();

  for (const def of sheets) {
    const ws = wb.addWorksheet(def.name);

    ws.columns = def.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 18,
    }));

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.font = HEADER_FONT;
    headerRow.fill = HEADER_FILL;
    headerRow.alignment = { vertical: "middle" };
    headerRow.commit();

    // Apply per-column alignment and numFmt to header cell
    def.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      if (col.align) cell.alignment = { horizontal: col.align, vertical: "middle" };
    });

    // Data rows
    for (const rowData of def.rows) {
      const row = ws.addRow(rowData);
      def.columns.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        if (col.numFmt) cell.numFmt = col.numFmt;
        if (col.align) cell.alignment = { horizontal: col.align };
      });
      row.commit();
    }

    // Optional totals row
    if (def.totalsRow) {
      const row = ws.addRow(def.totalsRow);
      row.font = TOTALS_FONT;
      row.border = TOTALS_BORDER;
      def.columns.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        if (col.numFmt) cell.numFmt = col.numFmt;
        if (col.align) cell.alignment = { horizontal: col.align };
      });
      row.commit();
    }
  }

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  return new Response(buffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
