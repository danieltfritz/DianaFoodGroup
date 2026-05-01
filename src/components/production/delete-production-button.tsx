"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteProduction } from "@/lib/actions/production";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteProductionButton({ productionId }: { productionId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handleClick() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    startTransition(async () => {
      await deleteProduction(productionId);
      router.push("/production");
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <Trash2 className="size-4 mr-2" />
      )}
      {confirmed ? "Confirm Delete" : "Delete Run"}
    </Button>
  );
}
