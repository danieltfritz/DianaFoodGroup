"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { importKidCounts, type ImportKidCountsResult } from "@/lib/actions/import-kid-counts";

function ResultPanel({ result }: { result: ImportKidCountsResult }) {
  const hasErrors = result.errors.length > 0;
  const hasUnmatched = result.unmatched.length > 0;
  const ok = result.processed > 0 && !hasErrors;

  return (
    <div className="space-y-4 mt-6">
      <div className={`rounded-md border p-4 ${ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="font-semibold text-sm">
          Import complete for <strong>{result.date}</strong>
        </p>
        <p className="text-sm mt-1">
          <strong>{result.processed}</strong> records upserted &middot; <strong>{result.skipped}</strong> zero-count rows skipped
        </p>
      </div>

      {result.ageGroupMapping.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Age group mapping used:</p>
          <table className="text-xs border rounded-md overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-1.5">CSV Column</th>
                <th className="text-left px-3 py-1.5">→ DB Age Group</th>
              </tr>
            </thead>
            <tbody>
              {result.ageGroupMapping.map((m) => (
                <tr key={m.csvName} className="border-t">
                  <td className="px-3 py-1">{m.csvName}</td>
                  <td className="px-3 py-1 text-muted-foreground">{m.dbName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasErrors && (
        <div>
          <p className="text-sm font-medium text-destructive mb-1">Errors ({result.errors.length}):</p>
          <ul className="text-xs space-y-0.5 text-destructive">
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {hasUnmatched && (
        <div>
          <p className="text-sm font-medium text-amber-700 mb-1">Unmatched schools ({result.unmatched.length}) — skipped:</p>
          <ul className="text-xs space-y-0.5 text-muted-foreground">
            {result.unmatched.map((u, i) => (
              <li key={i}><span className="font-medium">{u.name}</span> — {u.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ImportKidCountsPage() {
  const [result, action, pending] = useActionState<ImportKidCountsResult | null, FormData>(
    importKidCounts,
    null
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/admin" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Kid Counts</h1>
      </div>

      <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
        <p className="font-medium">Expected CSV format (DeliveryReport.csv)</p>
        <p className="text-muted-foreground">
          27 columns: School Name, BreakfastMenu, Breakfast counts ×5, LunchMenu, Lunch counts ×5,
          Snack counts ×5, Dinner counts ×5. Age group columns must be in the same order as DB age groups sorted by ID.
        </p>
        <p className="text-muted-foreground">
          School names are matched exactly, then by normalized name (case-insensitive, whitespace collapsed).
          Unmatched schools are skipped and listed in the results. Zero counts are skipped.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="date">Delivery Date</label>
          <input
            id="date"
            type="date"
            name="date"
            required
            defaultValue={today}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="csv">CSV File</label>
          <input
            id="csv"
            type="file"
            name="csv"
            accept=".csv,text/csv"
            required
            className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:font-medium file:cursor-pointer"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </form>

      {result && <ResultPanel result={result} />}
    </div>
  );
}
