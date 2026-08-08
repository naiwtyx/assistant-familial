"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-time-field";
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
import { haptic } from "@/lib/haptics";
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

/** Petit champ compact utilisé pour la zone Détails (moins proéminent que le nom). */
function DetailField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-muted-foreground text-[11px] font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

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

    const onSuccess = () => {
      haptic("success");
      onOpenChange(false);
    };
    const onError = (error: unknown) => toast.error(getErrorMessage(error));

    if (isEdit && item) {
      updateItem.mutate({ id: item.id, input: parsed.data }, { onSuccess, onError });
    } else {
      addItem.mutate(parsed.data, { onSuccess, onError });
    }
  }

  function changeQuantity(delta: number) {
    setQuantity((current) => Math.max(0, current + delta));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
          <DialogDescription>
            Un nom suffit — la catégorie, l&apos;emplacement et la date restent optionnels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Nom : le champ principal, très proéminent, autofocus. */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="inv-name"
              className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
            >
              Nom du produit
            </Label>
            <Input
              id="inv-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Œufs"
              autoFocus
              className="h-11 text-[15px]"
            />
          </div>

          {/* Quantité + unité : essentiels mais compacts, façon stepper. */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Quantité
            </Label>
            <div className="flex items-center gap-2">
              <div className="bg-muted/60 flex items-center rounded-xl p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg text-lg"
                  onClick={() => changeQuantity(-1)}
                  disabled={quantity <= 0}
                  aria-label="Diminuer"
                >
                  −
                </Button>
                <Input
                  id="inv-qty"
                  type="number"
                  min={0}
                  max={99999}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))}
                  className="h-9 w-14 border-0 bg-transparent text-center text-[15px] font-medium tabular-nums shadow-none focus-visible:ring-0"
                  aria-label="Quantité"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg text-lg"
                  onClick={() => changeQuantity(1)}
                  aria-label="Augmenter"
                >
                  +
                </Button>
              </div>
              <NativeSelect
                id="inv-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="h-11 flex-1"
                aria-label="Unité"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Détails secondaires : visuellement retrait, dans une sous-carte muted. */}
          <div className="bg-muted/40 flex flex-col gap-3 rounded-2xl p-3">
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
              Détails
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DetailField id="inv-cat" label="Catégorie">
                <NativeSelect
                  id="inv-cat"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </NativeSelect>
              </DetailField>
              <DetailField id="inv-loc" label="Emplacement">
                <NativeSelect
                  id="inv-loc"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="h-10"
                >
                  {STORAGE_LOCATIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </NativeSelect>
              </DetailField>
            </div>
            <DetailField id="inv-exp" label="Date de péremption · optionnelle">
              <DateField
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder="Aucune date"
                ariaLabel="Date de péremption"
              />
            </DetailField>
          </div>

          {/* Barre d'action collée en bas : reste au-dessus du clavier iOS. */}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="flex-[2]">
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
