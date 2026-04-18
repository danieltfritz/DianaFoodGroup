type RunInfo = { id: number; deliveryDate: Date };

type DetailInfo = {
  schoolId: number;
  schoolName: string;
  mealId: number;
  ageGroupId: number;
  kidCount: number;
  priceUsed: number;
};

type QbCode = {
  mealId: number;
  ageGroupId: number;
  qbCode: string;
  description: string;
};

function iifDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function invoiceNum(schoolName: string, date: Date): string {
  const abbr = schoolName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${abbr}${mm}${yyyy}`;
}

export function generateIIF(run: RunInfo, details: DetailInfo[], qbCodes: QbCode[]): string {
  const qbMap = new Map(qbCodes.map((q) => [`${q.mealId}-${q.ageGroupId}`, q]));
  const dateStr = iifDate(run.deliveryDate);

  // Group details by school
  const bySchool = new Map<number, { schoolName: string; rows: DetailInfo[] }>();
  for (const d of details) {
    let entry = bySchool.get(d.schoolId);
    if (!entry) {
      entry = { schoolName: d.schoolName, rows: [] };
      bySchool.set(d.schoolId, entry);
    }
    entry.rows.push(d);
  }

  const tab = "\t";
  const lines: string[] = [
    // IIF header
    ["!TRNS", "TRNSID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO", "CLEAR", "TOPRINT"].join(tab),
    ["!SPL", "SPLID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "MEMO"].join(tab),
    "!ENDTRNS",
  ];

  let splId = run.id * 10000;

  for (const [schoolId, { schoolName, rows }] of bySchool) {
    const total = rows.reduce((s, r) => s + r.kidCount * r.priceUsed, 0);
    const docNum = invoiceNum(schoolName, run.deliveryDate);
    const memo = `Delivery ${dateStr}`;

    lines.push(
      [
        "TRNS",
        String(schoolId),
        "INVOICE",
        dateStr,
        "Accounts Receivable",
        schoolName,
        total.toFixed(2),
        docNum,
        memo,
        "N",
        "Y",
      ].join(tab)
    );

    for (const row of rows) {
      const qb = qbMap.get(`${row.mealId}-${row.ageGroupId}`);
      const account = qb?.qbCode ?? "Income";
      const description = qb?.description ?? `Meal ${row.mealId}`;
      const amount = -(row.kidCount * row.priceUsed);

      lines.push(
        [
          "SPL",
          String(++splId),
          "INVOICE",
          dateStr,
          account,
          schoolName,
          amount.toFixed(2),
          description,
        ].join(tab)
      );
    }

    lines.push("ENDTRNS");
  }

  return lines.join("\n");
}
