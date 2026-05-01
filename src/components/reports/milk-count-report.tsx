import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MilkCountReportData } from "@/lib/reports";

export function MilkCountReport({ data }: { data: MilkCountReportData }) {
  if (data.routes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No milk count data for this date.
      </p>
    );
  }

  const { columns, routes, grandTotals } = data;
  const grandTotal = Object.values(grandTotals).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">School</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-right whitespace-nowrap">
                  <div>{col.ageGroupName}</div>
                  <div className="text-muted-foreground font-normal text-xs">{col.name}</div>
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => {
              const routeTotal = Object.values(route.totals).reduce((s, v) => s + v, 0);
              return (
                <React.Fragment key={`route-${route.routeId}`}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={columns.length + 2} className="text-xs font-semibold text-muted-foreground py-1.5 px-4">
                      Route: {route.routeName}
                    </TableCell>
                  </TableRow>
                  {route.schools.map((school) => {
                    const schoolTotal = Object.values(school.counts).reduce((s, v) => s + v, 0);
                    return (
                      <TableRow key={school.schoolId}>
                        <TableCell className="pl-6">{school.schoolName}</TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.key} className="text-right">
                            {school.counts[col.key] ?? ""}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium">{schoolTotal || ""}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow key={`route-${route.routeId}-totals`} className="font-semibold border-t">
                    <TableCell className="pl-4">Route {route.routeName} Total</TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="text-right">
                        {route.totals[col.key] || ""}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{routeTotal || ""}</TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            <TableRow className="font-bold border-t-2">
              <TableCell>Totals</TableCell>
              {columns.map((col) => (
                <TableCell key={col.key} className="text-right">
                  {grandTotals[col.key] || ""}
                </TableCell>
              ))}
              <TableCell className="text-right">{grandTotal || ""}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
