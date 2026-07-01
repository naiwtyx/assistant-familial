"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { categoryLabel, locationLabel, unitLabel } from "@/config/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/db";

import { useRemoveInventoryItem, useSetInventoryQuantity } from "../hooks/use-inventory";
import { formatExpiry, getExpiryStatus, type ExpiryStatus } from "../lib/expiry";
import { InventoryFormDialog } from "./inventory-form-dialog";

const EXPIRY_STYLES: Record<ExpiryStatus, string> = {
  expired: "bg-destructive/10 text-destructive",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ok: "bg-muted text-muted-foreground",
};

const EXPIRY_PREFIX: Record<ExpiryStatus, string> = {
  expired: "Périmé · ",
  soon: "Bientôt · ",
  ok: "",
};

export function InventoryItemCard({ item, familyId }: { item: InventoryItem; familyId: string }) {
  const setQuantity = useSetInventoryQuantity(familyId);
  const remove = useRemoveInventoryItem(familyId);
  const [editing, setEditing] = useState(false);

  const onError = (error: unknown) => toast.error(getErrorMessage(error));
  const status = getExpiryStatus(item.expiry_date);

  function changeQuantity(delta: number) {
    const next = Math.max(0, item.quantity + delta);
    if (next === item.quantity) return;
    setQuantity.mutate({ id: item.id, quantity: next }, { onError });
  }

  return (
    <div className="bg-card flex items-center gap-2 rounded-xl border p-3">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Modifier ${item.name}`}
      >
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{categoryLabel(item.category)}</span>
          <span aria-hidden>·</span>
          <span>{locationLabel(item.location)}</span>
          {item.expiry_date && status ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                EXPIRY_STYLES[status],
              )}
            >
              {EXPIRY_PREFIX[status]}
              {formatExpiry(item.expiry_date)}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => changeQuantity(-1)}
          disabled={item.quantity <= 0}
          aria-label="Diminuer la quantité"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="min-w-10 text-center text-sm tabular-nums">
          {item.quantity}
          {item.unit ? <span className="text-muted-foreground text-xs"> {unitLabel(item.unit)}</span> : null}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => changeQuantity(1)}
          aria-label="Augmenter la quantité"
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-7"
          onClick={() => remove.mutate(item.id, { onError })}
          aria-label="Supprimer le produit"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <InventoryFormDialog familyId={familyId} item={item} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
