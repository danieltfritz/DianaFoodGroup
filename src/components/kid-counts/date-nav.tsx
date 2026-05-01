"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNav({ date, basePath = "/kid-counts" }: { date: string; basePath?: string }) {
  const router = useRouter();

  function go(d: string) {
    router.push(`${basePath}?date=${d}`);
  }

  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    go(d.toISOString().split("T")[0]);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => shift(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => go(e.target.value)}
        className="w-40"
      />
      <Button variant="outline" size="icon" onClick={() => shift(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
