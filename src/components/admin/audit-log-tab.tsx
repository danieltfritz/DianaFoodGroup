import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AuditEntry = {
  id: number;
  schoolName: string;
  date: Date;
  mealName: string;
  ageGroupName: string;
  oldCount: number;
  newCount: number;
  userName: string | null;
  userEmail: string;
  changedAt: Date;
};

export function AuditLogTab({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No audit records yet. Changes to kid counts will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Showing the 200 most recent kid count changes.</p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Age Group</TableHead>
              <TableHead className="text-right">Old</TableHead>
              <TableHead className="text-right">New</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(e.changedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">{e.userName ?? e.userEmail}</TableCell>
                <TableCell className="font-medium">{e.schoolName}</TableCell>
                <TableCell className="text-sm">{new Date(e.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm">{e.mealName}</TableCell>
                <TableCell className="text-sm">{e.ageGroupName}</TableCell>
                <TableCell className="text-right text-muted-foreground">{e.oldCount}</TableCell>
                <TableCell className="text-right font-semibold">{e.newCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
