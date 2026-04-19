"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, ChevronRight, CalendarOff, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SchoolForm } from "./school-form";
import { createSchool, updateSchool, deleteSchool } from "@/lib/actions/schools";
import { createHolidayClosing } from "@/lib/actions/school-menus";

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

type SortKey = "name" | "city" | "route" | "county";
type SortDir = "asc" | "desc";

export function SchoolsTable({ schools, routes, counties }: { schools: School[]; routes: Route[]; counties: County[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ startDate: "", endDate: "" });
  const [holidaySaving, setHolidaySaving] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const getValue = (s: School, key: SortKey) => {
    if (key === "name") return s.name.toLowerCase();
    if (key === "city") return (s.city ?? "").toLowerCase();
    if (key === "route") return (s.route?.name ?? "").toLowerCase();
    if (key === "county") return (s.county?.name ?? "").toLowerCase();
    return "";
  };

  const base = activeOnly ? schools.filter((s) => s.active) : schools;
  const displayed = [...base].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  async function handleHolidaySubmit(e: React.FormEvent) {
    e.preventDefault();
    setHolidaySaving(true);
    await createHolidayClosing({
      startDate: new Date(holidayForm.startDate),
      endDate: new Date(holidayForm.endDate),
    });
    setHolidayForm({ startDate: "", endDate: "" });
    setHolidaySaving(false);
    setHolidayOpen(false);
  }

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
            <Label htmlFor="active-only" className="text-sm cursor-pointer">Active only</Label>
          </div>
          <Button variant="outline" onClick={() => setHolidayOpen(true)}>
            <CalendarOff className="mr-2 size-4" />Holiday Closing
          </Button>
          <Button onClick={openCreate}><Plus className="mr-2 size-4" />Add School</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Name"   col="name"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHead label="City"   col="city"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHead label="Route"  col="route"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHead label="County" col="county" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <TableHead>Delivery Days</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {activeOnly ? "No active schools." : "No schools yet. Add one to get started."}
                </TableCell>
              </TableRow>
            )}
            {displayed.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/schools/${s.id}`} className="hover:underline">{s.name}</Link>
                </TableCell>
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
                    <Button size="icon" variant="ghost" nativeButton={false} render={<Link href={`/schools/${s.id}`} />}>
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

      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Holiday Closing — All Schools</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Closes every active school for the selected date range.
          </p>
          <form onSubmit={handleHolidaySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={holidayForm.startDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={holidayForm.endDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setHolidayOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={holidaySaving}>
                {holidaySaving ? "Saving…" : "Close All Schools"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortHead({ label, col, sortKey, sortDir, onSort }: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <TableHead>
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-foreground transition-colors select-none"
      >
        {label}
        <Icon className="size-3 opacity-60" />
      </button>
    </TableHead>
  );
}
