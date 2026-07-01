"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PRODUCT_CATEGORIES, STORAGE_LOCATIONS, UNITS } from "@/config/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import type { InventoryItem } from "@/types/db";

import { useAddInventoryItem, useUpdateInventoryItem } from "../hooks/use-inventory";
import { inventoryItemSchema } from "../schemas/inventory.schema";

type Props = {
  familyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Présent => mode édition. */
  item?: InventoryItem;
};

export function InventoryFormDialog({ familyId, open, onOpenChange, item }: Props) {
  const isEdit = Boolean(item);
  const addItem = useAddInventoryItem(familyId);
  const updateItem = useUpdateInventoryItem(familyId);
  const pending = addItem.isPending || updateItem.isPending;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("grocery");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("piece");
  const [location, setLocation] = useState("pantry");
  const [expiryDate, setExpiryDate] = useState("");

  // Réinitialise le formulaire à chaque ouverture (création ou édition).
  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "grocery");
    setQuantity(item?.quantity ?? 1);
    setUnit(item?.unit ?? "piece");
    setLocation(item?.location ?? "pantry");
    setExpiryDate(item?.expiry_date ?? "");
  }, [open, item]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = inventoryItemSchema.safeParse({
      name,
      category,
      quantity,
      unit,
      location,
      expiryDate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    const onSuccess = () => onOpenChange(false);
    const onError = (error: unknown) => toast.error(getErrorMessage(error));

    if (isEdit && item) {
      updateItem.mutate({ id: item.id, input: parsed.data }, { onSuccess, onError });
    } else {
      addItem.mutate(parsed.data, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
          <DialogDescription>Renseigne les informations du produit.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="inv-name">Nom</Label>
            <Input
              id="inv-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Lait demi-écrémé"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-qty">Quantité</Label>
              <Input
                id="inv-qty"
                type="number"
                min={0}
                max={99999}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-unit">Unité</Label>
              <NativeSelect
                id="inv-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="inv-cat">Catégorie</Label>
            <NativeSelect
              id="inv-cat"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="inv-loc">Emplacement</Label>
            <NativeSelect
              id="inv-loc"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              {STORAGE_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="inv-exp">Date de péremption (optionnel)</Label>
            <Input
              id="inv-exp"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
