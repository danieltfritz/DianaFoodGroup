"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runProduction } from "@/lib/actions/production";
import { Loader2 } from "lucide-react";

export function RunProductionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const dateStr = (form.elements.namedItem("productionDate") as HTMLInputElement).value;
    if (!dateStr) return;

    startTransition(async () => {
      try {
        await runProduction({ productionDate: new Date(dateStr + "T00:00:00.000Z") });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="productionDate">Production Date</Label>
        <Input
          id="productionDate"
          name="productionDate"
          type="date"
          defaultValue={today}
          disabled={isPending}
          className="w-44"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
        Calculate Production
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
