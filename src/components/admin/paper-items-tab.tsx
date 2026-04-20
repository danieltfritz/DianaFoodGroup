"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type PaperSize = { id: number; name: string | null };
type PaperContainer = { id: number; paperSizeId: number; containerName: string; containerSize: number };
type PaperItem = {
  id: number;
  name: string;
  active: boolean;
  sizes: PaperSize[];
  containers: PaperContainer[];
};

export function PaperItemsTab({ paperItems }: { paperItems: PaperItem[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Paper Items</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead>Packaging</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paperItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                  No paper items. Run the PG1 import script.
                </TableCell>
              </TableRow>
            )}
            {paperItems.map((item) => {
              const namedSizes = item.sizes.filter((s) => s.name);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {namedSizes.length > 0
                      ? namedSizes.map((s) => s.name).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {item.containers.map((c) => {
                        const size = item.sizes.find((s) => s.id === c.paperSizeId);
                        const label = size?.name ? `${size.name} · ` : "";
                        return (
                          <span key={c.id}>{label}{c.containerName}: {c.containerSize}</span>
                        );
                      })}
                      {item.containers.length === 0 && "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.active
                      ? <Badge>Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
