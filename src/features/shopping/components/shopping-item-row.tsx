"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { ShoppingItem } from "@/types/db";

import {
  useRemoveShoppingItem,
  useSetShoppingItemChecked,
  useUpdateShoppingItem,
} from "../hooks/use-shopping-list";

export function ShoppingItemRow({ item, familyId }: { item: ShoppingItem; familyId: string }) {
  const toggle = useSetShoppingItemChecked(familyId);
  const update = useUpdateShoppingItem(familyId);
  const remove = useRemoveShoppingItem(familyId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  // Un article optimiste (pas encore confirmé par le serveur) n'a pas d'id réel :
  // on désactive ses actions tant que l'insertion n'est pas confirmée.
  const isPendingItem = item.id.startsWith("temp-");

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function saveName() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === item.name) {
      setDraft(item.name);
      return;
    }
    update.mutate(
      { id: item.id, patch: { name: trimmed } },
      {
        onError: (error) => {
          setDraft(item.name);
          onError(error);
        },
      },
    );
  }

  function changeQuantity(delta: number) {
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity) return;
    update.mutate({ id: item.id, patch: { quantity: next } }, { onError });
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={(checked) =>
          toggle.mutate({ id: item.id, isChecked: checked === true }, { onError })
        }
        disabled={isPendingItem}
        aria-label={item.is_checked ? "Marquer comme non acheté" : "Marquer comme acheté"}
      />

      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveName}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveName();
            if (event.key === "Escape") {
              setDraft(item.name);
              setEditing(false);
            }
          }}
          className="h-8 flex-1"
          aria-label="Modifier le nom"
        />
      ) : (
        <button
          type="button"
          onClick={() => !isPendingItem && setEditing(true)}
          className={cn(
            "flex-1 truncate text-left text-sm",
            item.is_checked && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </button>
      )}

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => changeQuantity(-1)}
          disabled={isPendingItem || item.quantity <= 1}
          aria-label="Diminuer la quantité"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => changeQuantity(1)}
          disabled={isPendingItem}
          aria-label="Augmenter la quantité"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-7"
        onClick={() => remove.mutate(item.id, { onError })}
        disabled={isPendingItem}
        aria-label="Supprimer l'article"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
