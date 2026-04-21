import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculatePaperProduction } from "@/lib/paper-production";
import { saveProductionRun } from "@/lib/actions/paper";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function PaperGoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; groupId?: string; schoolId?: string; startDate?: string; endDate?: string }>;
}) {
  const { mode: modeParam, groupId: groupIdParam, schoolId: schoolIdParam, startDate: startParam, endDate: endParam } = await searchParams;

  const mode = modeParam === "school" ? "school" : "group";

  const [groups, schools] = await Promise.all([
    prisma.paperGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.school.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultStart.getDate() + 4); // Friday

  const startStr = startParam ?? defaultStart.toISOString().split("T")[0];
  const endStr = endParam ?? defaultEnd.toISOString().split("T")[0];

  const selectedGroupId = groupIdParam ? Number(groupIdParam) : null;
  const selectedSchoolId = schoolIdParam ? Number(schoolIdParam) : null;

  let preview = null;
  let previewError: string | null = null;

  const canCalculate = startParam && endParam && (
    (mode === "group" && selectedGroupId) ||
    (mode === "school" && selectedSchoolId)
  );

  if (canCalculate) {
    try {
      const startDate = new Date(startParam! + "T00:00:00");
      const endDate = new Date(endParam! + "T00:00:00");

      let schoolIds: number[] = [];
      if (mode === "group") {
        const rows = await prisma.schoolPaperGroup.findMany({
          where: { paperGroupId: selectedGroupId! },
          select: { schoolId: true },
        });
        schoolIds = rows.map((r) => r.schoolId);
        if (schoolIds.length === 0) previewError = "No schools in this group.";
      } else {
        schoolIds = [selectedSchoolId!];
      }

      if (schoolIds.length > 0) {
        preview = await calculatePaperProduction(schoolIds, startDate, endDate);
        if (preview.schoolTotals.length === 0) previewError = "No paper items calculated for this date range.";
      }
    } catch (e) {
      previewError = String(e);
    }
  }

  const grandTotal = preview?.schoolTotals.flatMap((s) => s.items).reduce((sum, i) => sum + i.totalQty, 0) ?? 0;

  const tabBase = "px-4 py-1.5 text-sm rounded-md font-medium transition-colors";
  const tabActive = "bg-primary text-primary-foreground shadow-sm";
  const tabInactive = "text-muted-foreground hover:text-foreground hover:bg-muted";

  const selectClass = "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-52";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Paper Goods</h1>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/paper-goods/reports" />}>
          <BarChart3 className="size-4 mr-2" />
          Reports
        </Button>
      </div>

      {/* Mode tabs */}
      <div className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
        <Link
          href={`?mode=group&startDate=${startStr}&endDate=${endStr}`}
          className={cn(tabBase, mode === "group" ? tabActive : tabInactive)}
        >
          By Group
        </Link>
        <Link
          href={`?mode=school&startDate=${startStr}&endDate=${endStr}`}
          className={cn(tabBase, mode === "school" ? tabActive : tabInactive)}
        >
          By School
        </Link>
      </div>

      {/* Calculate form — GET */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="mode" value={mode} />

        {mode === "group" ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="groupId">Group</label>
            <select id="groupId" name="groupId" defaultValue={selectedGroupId ?? ""} className={selectClass}>
              <option value="">— select —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="schoolId">School</label>
            <select id="schoolId" name="schoolId" defaultValue={selectedSchoolId ?? ""} className={selectClass}>
              <option value="">— select —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            defaultValue={startStr}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            defaultValue={endStr}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <Button type="submit">Calculate</Button>
      </form>

      {previewError && (
        <p className="text-sm text-destructive">{previewError}</p>
      )}

      {preview && preview.schoolTotals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Preview — {preview.schoolTotals.length} school{preview.schoolTotals.length !== 1 ? "s" : ""}, {grandTotal.toLocaleString()} total items
            </h2>
            <form action={saveProductionRun}>
              {mode === "group" && <input type="hidden" name="paperGroupId" value={selectedGroupId!} />}
              <input type="hidden" name="startDate" value={startParam!} />
              <input type="hidden" name="endDate" value={endParam!} />
              <input
                type="hidden"
                name="amounts"
                value={JSON.stringify(
                  preview.schoolTotals.flatMap((s) =>
                    s.items.map((item) => ({
                      schoolId: s.schoolId,
                      paperId: item.paperId,
                      paperSizeId: item.paperSizeId,
                      totalQty: item.totalQty,
                    }))
                  )
                )}
              />
              <Button type="submit" variant="default">Save Run</Button>
            </form>
          </div>

          {preview.schoolTotals.map((school) => (
            <div key={school.schoolId} className="rounded-md border">
              <div className="px-4 py-2 border-b bg-muted/30">
                <span className="font-medium">{school.schoolName}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper Item</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {school.items.map((item) => (
                    <TableRow key={`${item.paperId}-${item.paperSizeId ?? 0}`}>
                      <TableCell>{item.paperName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.paperSizeName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{item.totalQty.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
