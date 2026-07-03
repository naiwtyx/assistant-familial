"use client";

import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { UNITS, unitLabel } from "@/config/constants";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { findInventoryMatches } from "@/features/inventory/lib/find-inventory-matches";
import { getErrorMessage } from "@/lib/get-error-message";

import { useAddShoppingItem } from "../hooks/use-shopping-list";

/**
 * Formulaire d'ajout rapide (nom + quantité). Affiche un rappel si le produit
 * saisi existe déjà dans l'inventaire, avec la quantité restante.
 */
export function AddItemForm({ familyId }: { familyId: string }) {
  const addItem = useAddShoppingItem(familyId);
  const { data: inventory } = useInventory(familyId);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");

  const matches = findInventoryMatches(name, inventory ?? []).slice(0, 2);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    addItem.mutate(
      { name: trimmed, quantity, unit: unit || undefined },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
    setName("");
    setQuantity(1);
    setUnit("");
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ajouter un article…"
          aria-label="Nom de l'article"
          autoComplete="off"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={9999}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            aria-label="Quantité"
            className="w-16 text-center"
          />
          <NativeSelect
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            aria-label="Unité"
            className="flex-1"
          >
            <option value="">Unité (option.)</option>
            {UNITS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="icon" disabled={!name.trim()} aria-label="Ajouter l'article">
            <Plus className="size-4" />
          </Button>
        </div>
      </form>

      {matches.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <Package className="mt-0.5 size-4 shrink-0" />
          <span>
            Déjà en stock :{" "}
            {matches
              .map(
                (item) =>
                  `${item.name} (${item.quantity}${item.unit ? ` ${unitLabel(item.unit)}` : ""})`,
              )
              .join(", ")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
