"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";

import { useAddShoppingItem } from "../hooks/use-shopping-list";

/**
 * Formulaire d'ajout rapide. Volontairement simple (nom + quantité) pour une
 * saisie fluide : l'article apparaît immédiatement grâce à la mutation optimiste.
 */
export function AddItemForm({ familyId }: { familyId: string }) {
  const addItem = useAddShoppingItem(familyId);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    addItem.mutate(
      { name: trimmed, quantity },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
    setName("");
    setQuantity(1);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ajouter un article…"
        aria-label="Nom de l'article"
        autoComplete="off"
        className="flex-1"
      />
      <Input
        type="number"
        min={1}
        max={9999}
        value={quantity}
        onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
        aria-label="Quantité"
        className="w-16 text-center"
      />
      <Button type="submit" size="icon" disabled={!name.trim()} aria-label="Ajouter l'article">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
