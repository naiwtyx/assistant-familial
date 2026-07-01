"use client";

import { Camera, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";

import { useInventory } from "../hooks/use-inventory";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { InventoryItemCard } from "./inventory-item-card";

export function InventoryView() {
  const family = useActiveFamily();
  const router = useRouter();
  const { data: items, isLoading, isError } = useInventory(family.id);
  const [adding, setAdding] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inventaire</h1>
          <p className="text-muted-foreground text-sm">{family.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/scanner")}
            aria-label="Scanner un ticket"
          >
            <Camera className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;inventaire.</p>
      ) : items && items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
          <Package className="size-8 opacity-40" />
          <p>
            Ton inventaire est vide.
            <br />
            Ajoute ton premier produit.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items?.map((item) => (
            <InventoryItemCard key={item.id} item={item} familyId={family.id} />
          ))}
        </div>
      )}

      <InventoryFormDialog familyId={family.id} open={adding} onOpenChange={setAdding} />
    </main>
  );
}
