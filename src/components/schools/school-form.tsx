"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";

const schema = z.object({
  name: z.string().min(1, "Required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  fax: z.string().optional(),
  routeId: z.number().nullable(),
  countyId: z.number().nullable(),
  deliveryMon: z.boolean(),
  deliveryTue: z.boolean(),
  deliveryWed: z.boolean(),
  deliveryThu: z.boolean(),
  deliveryFri: z.boolean(),
  deliverySat: z.boolean(),
  deliverySun: z.boolean(),
  notes: z.string().optional(),
  active: z.boolean(),
  milkTier: z.enum(["small", "medium", "large"]),
});

type FormValues = z.infer<typeof schema>;

type Route = { id: number; name: string };
type County = { id: number; name: string };

interface SchoolFormProps {
  defaultValues?: Partial<FormValues>;
  routes: Route[];
  counties: County[];
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
}

const DAYS = [
  { key: "deliveryMon" as const, label: "Mon" },
  { key: "deliveryTue" as const, label: "Tue" },
  { key: "deliveryWed" as const, label: "Wed" },
  { key: "deliveryThu" as const, label: "Thu" },
  { key: "deliveryFri" as const, label: "Fri" },
  { key: "deliverySat" as const, label: "Sat" },
  { key: "deliverySun" as const, label: "Sun" },
];

export function SchoolForm({ defaultValues, routes, counties, onSubmit, onCancel }: SchoolFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      active: true,
      deliveryMon: false,
      deliveryTue: false,
      deliveryWed: false,
      deliveryThu: false,
      deliveryFri: false,
      deliverySat: false,
      deliverySun: false,
      routeId: null,
      countyId: null,
      milkTier: "medium" as const,
      ...defaultValues,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="name">School Name *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input id="postalCode" {...register("postalCode")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" {...register("contactName")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" {...register("email")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fax">Fax</Label>
          <Input id="fax" {...register("fax")} />
        </div>

        <div className="space-y-1">
          <Label>Route</Label>
          <Combobox
            value={watch("routeId")?.toString() ?? ""}
            onValueChange={(v) => setValue("routeId", v ? Number(v) : null)}
            options={routes.map((r) => ({ value: r.id.toString(), label: r.name }))}
            placeholder="Select route…"
            clearable
          />
        </div>

        <div className="space-y-1">
          <Label>County</Label>
          <Combobox
            value={watch("countyId")?.toString() ?? ""}
            onValueChange={(v) => setValue("countyId", v ? Number(v) : null)}
            options={counties.map((c) => ({ value: c.id.toString(), label: c.name }))}
            placeholder="Select county…"
            clearable
          />
        </div>

        <div className="space-y-1">
          <Label>Milk Overage Tier</Label>
          <Select
            value={watch("milkTier")}
            onValueChange={(v) => setValue("milkTier", v as "small" | "medium" | "large")}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (+65% overage)</SelectItem>
              <SelectItem value="medium">Medium (+50% overage)</SelectItem>
              <SelectItem value="large">Large (+5% overage)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Delivery Days</Label>
          <div className="flex gap-4">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <Checkbox
                  id={key}
                  checked={watch(key)}
                  onCheckedChange={(v) => setValue(key, !!v)}
                />
                <Label htmlFor={key} className="text-xs">{label}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={3} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="active"
            checked={watch("active")}
            onCheckedChange={(v) => setValue("active", !!v)}
          />
          <Label htmlFor="active">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
