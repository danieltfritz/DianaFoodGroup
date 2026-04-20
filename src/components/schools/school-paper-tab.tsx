"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveSchoolPaperComment } from "@/lib/actions/paper";

type PaperGroup = { id: number; name: string };

interface SchoolPaperTabProps {
  schoolId: number;
  groups: PaperGroup[];
  comment: string | null;
}

export function SchoolPaperTab({ schoolId, groups, comment }: SchoolPaperTabProps) {
  const [text, setText] = useState(comment ?? "");
  const [isPending, startTransition] = useTransition();
  const dirty = text.trim() !== (comment ?? "").trim();

  function handleSave() {
    startTransition(async () => {
      await saveSchoolPaperComment(schoolId, text);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1.5">Paper Delivery Groups</p>
        {groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => <Badge key={g.id} variant="secondary">{g.name}</Badge>)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not assigned to any paper delivery group.</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-1.5">Delivery Notes</p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Delivery instructions or comments…"
          className="min-h-[100px] text-sm"
        />
        {dirty && (
          <Button
            size="sm"
            className="mt-2"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}
