"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { copyKidCountsFromPreviousWeek } from "@/lib/actions/kid-counts";

export function CopyLastWeekButton({ date }: { date: string }) {
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleCopy() {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevStr = prevDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!confirm(`Copy kid counts from ${prevStr} (last week) to this date? Existing counts will be overwritten.`)) return;

    setMessage("");
    startTransition(async () => {
      try {
        const { copied } = await copyKidCountsFromPreviousWeek(date);
        setMessage(copied > 0 ? `Copied ${copied} count${copied !== 1 ? "s" : ""} from last week.` : "No counts found for last week.");
      } catch {
        setMessage("Failed to copy counts.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy className="mr-1 size-3" />Copy Last Week
      </Button>
    </div>
  );
}
