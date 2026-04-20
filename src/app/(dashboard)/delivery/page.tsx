import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDeliveryData } from "@/lib/delivery";
import { parseLocalDate } from "@/lib/cycle";
import { DateNav } from "@/components/kid-counts/date-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Tag } from "lucide-react";

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ date?: string; route?: string }> }) {
  const { date: dateParam, route: routeParam } = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateParam ?? today.toISOString().split("T")[0];
  const date = parseLocalDate(dateStr);

  const [schools, routes] = await Promise.all([
    getDeliveryData(date),
    prisma.route.findMany({ orderBy: { name: "asc" } }),
  ]);

  const routeFilter = routeParam ? Number(routeParam) : null;
  const filtered = routeFilter
    ? schools.filter((s) => s.routeId === routeFilter)
    : schools;

  const delivering = filtered.filter((s) => !s.isClosed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Delivery</h1>
        <div className="flex items-center gap-2">
          <DateNav date={dateStr} />
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/delivery/labels?date=${dateStr}${routeFilter ? `&route=${routeFilter}` : ""}`} />}>
            <Tag className="mr-2 size-4" />Labels
          </Button>
        </div>
      </div>

      {/* Route filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={!routeFilter ? "default" : "outline"} nativeButton={false}
          render={<Link href={`/delivery?date=${dateStr}`} />}
        >
          All Routes
        </Button>
        {routes.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={routeFilter === r.id ? "default" : "outline"} nativeButton={false}
            render={<Link href={`/delivery?date=${dateStr}&route=${r.id}`} />}
          >
            {r.name}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {delivering.length} schools delivering · {filtered.filter((s) => s.isClosed).length} closed
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="text-right">Total Kids</TableHead>
              <TableHead className="text-right">Food Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No schools delivering on this date.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => (
              <TableRow key={s.schoolId} className={s.isClosed ? "opacity-50" : ""}>
                <TableCell className="font-medium">{s.schoolName}</TableCell>
                <TableCell>{s.route ?? "—"}</TableCell>
                <TableCell className="text-right">{s.isClosed ? "—" : s.totalKids}</TableCell>
                <TableCell className="text-right">{s.isClosed ? "—" : s.lines.length}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {s.isClosed
                      ? <Badge variant="secondary">Closed</Badge>
                      : s.totalKids === 0
                      ? <Badge variant="outline">No counts</Badge>
                      : <Badge>Ready</Badge>}
                    {s.isBox && <Badge variant="outline">Box</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {!s.isClosed && (
                    <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/delivery/${s.schoolId}?date=${dateStr}`} />}>
                      <FileText className="mr-1 size-3" />Ticket
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
