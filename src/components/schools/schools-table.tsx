"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SchoolForm } from "./school-form";
import { createSchool, updateSchool, deleteSchool } from "@/lib/actions/schools";

type School = {
  id: number;
  name: string;
  city: string | null;
  contactName: string | null;
  phone: string | null;
  active: boolean;
  route: { id: number; name: string } | null;
  county: { id: number; name: string } | null;
  deliveryMon: boolean;
  deliveryTue: boolean;
  deliveryWed: boolean;
  deliveryThu: boolean;
  deliveryFri: boolean;
  deliverySat: boolean;
  deliverySun: boolean;
  address: string | null;
  state: string | null;
  postalCode: string | null;
  email: string | null;
  fax: string | null;
  notes: string | null;
  routeId: number | null;
  countyId: number | null;
  milkTier: string;
};

type Route = { id: number; name: string };
type County = { id: number; name: string };

const DAY_KEYS = ["deliveryMon", "deliveryTue", "deliveryWed", "deliveryThu", "deliveryFri", "deliverySat", "deliverySun"] as const;
const DAY_LABELS = ["M", "T", "W", "Th", "F", "Sa", "Su"];

export function SchoolsTable({ schools, routes, counties }: { schools: School[]; routes: Route[]; counties: County[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(s: School) {
    setEditing(s);
    setOpen(true);
  }
  function close() { setOpen(false); setEditing(null); }

  async function handleSubmit(data: Parameters<typeof createSchool>[0]) {
    if (editing) {
      await updateSchool(editing.id, data);
    } else {
      await createSchool(data);
    }
    close();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this school?")) return;
    await deleteSchool(id);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Button onClick={openCreate}><Plus className="mr-2 size-4" />Add School</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>County</TableHead>
              <TableHead>Delivery Days</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No schools yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
            {schools.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.city ?? "—"}</TableCell>
                <TableCell>{s.route?.name ?? "—"}</TableCell>
                <TableCell>{s.county?.name ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    {DAY_KEYS.map((key, i) => (
                      <span
                        key={key}
                        className={`text-xs px-1 rounded ${s[key] ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {DAY_LABELS[i]}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{s.contactName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={s.active ? "default" : "secondary"}>
                    {s.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" render={<Link href={`/schools/${s.id}`} />}>
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit School" : "Add School"}</DialogTitle>
          </DialogHeader>
          <SchoolForm
            defaultValues={editing ? {
              ...editing,
              milkTier: (editing.milkTier as "small" | "medium" | "large") ?? "medium",
              address: editing.address ?? undefined,
              city: editing.city ?? undefined,
              state: editing.state ?? undefined,
              postalCode: editing.postalCode ?? undefined,
              contactName: editing.contactName ?? undefined,
              phone: editing.phone ?? undefined,
              email: editing.email ?? undefined,
              fax: editing.fax ?? undefined,
              notes: editing.notes ?? undefined,
            } : undefined}
            routes={routes}
            counties={counties}
            onSubmit={handleSubmit}
            onCancel={close}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
