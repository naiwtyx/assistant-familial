"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { PRODUCT_CATEGORIES } from "@/config/constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";

import { useReceiptItems, useUpdateReceiptItemCategory } from "../hooks/use-budget";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type ReceiptSummary = {
  id: string;
  store: string | null;
  purchased_at: string;
  total: number | null;
};

/**
 * Détail d'un ticket : ses lignes, avec la catégorie corrigeable par un sélecteur.
 * Corriger une catégorie fiabilise la répartition et les graphiques du budget.
 */
export function ReceiptDetailDialog({
  familyId,
  receipt,
  onOpenChange,
}: {
  familyId: string;
  receipt: ReceiptSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: items, isLoading, isError } = useReceiptItems(familyId, receipt?.id ?? null);
  const updateCategory = useUpdateReceiptItemCategory(familyId);

  const dateLabel = receipt
    ? new Date(`${receipt.purchased_at}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  function changeCategory(itemId: string, category: string) {
    haptic("light");
    updateCategory.mutate(
      { itemId, category: category || null },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  return (
    <Dialog open={receipt != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt?.store ?? "Ticket"}</DialogTitle>
          <DialogDescription>
            {dateLabel}
            {receipt?.total != null ? ` · ${euro.format(receipt.total)}` : ""} — corrige une
            catégorie si besoin.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Chargement…
          </p>
        ) : isError ? (
          <p className="text-destructive py-6 text-center text-sm">
            Impossible de charger le détail du ticket.
          </p>
        ) : items && items.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="hover:bg-accent/40 flex items-center gap-2 rounded-xl p-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px]">{item.name}</p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {item.quantity > 1 ? `${item.quantity} × ` : ""}
                    {euro.format(item.price)}
                  </p>
                </div>
                <NativeSelect
                  value={item.category ?? "other"}
                  onChange={(event) => changeCategory(item.id, event.target.value)}
                  className="h-9 w-36 shrink-0"
                  aria-label={`Catégorie de ${item.name}`}
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </NativeSelect>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Ce ticket n&apos;a aucune ligne détaillée.
          </p>
        )}

        {updateCategory.isPending ? (
          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[11px]">
            <Loader2 className="size-3 animate-spin" />
            Enregistrement…
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
