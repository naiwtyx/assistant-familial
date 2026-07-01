"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { shoppingKeys } from "@/features/shopping/hooks/use-shopping-list";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { InventoryItem, ShoppingItem } from "@/types/db";

import type { InventoryItemInput } from "../schemas/inventory.schema";
import {
  addCheckedItemsToInventory,
  addInventoryItem,
  addInventoryItemsBatch,
  getInventory,
  removeInventoryItem,
  setInventoryQuantity,
  updateInventoryItem,
} from "../services/inventory.service";

export const inventoryKeys = {
  list: (familyId: string) => ["inventory-items", familyId] as const,
};

type ListContext = { previous?: InventoryItem[] };

export function useInventory(familyId: string) {
  const query = useQuery({
    queryKey: inventoryKeys.list(familyId),
    queryFn: () => getInventory(familyId),
  });

  useRealtimeTable("inventory_items", familyId, inventoryKeys.list(familyId));

  return query;
}

export function useAddInventoryItem(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryItemInput) => addInventoryItem(familyId, input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.list(familyId) });
    },
  });
}

export function useUpdateInventoryItem(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InventoryItemInput }) =>
      updateInventoryItem(familyId, id, input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.list(familyId) });
    },
  });
}

/** Ajustement rapide de la quantité (optimiste). */
export function useSetInventoryQuantity(familyId: string) {
  const queryClient = useQueryClient();
  const key = inventoryKeys.list(familyId);

  return useMutation<InventoryItem, Error, { id: string; quantity: number }, ListContext>({
    mutationFn: ({ id, quantity }) => setInventoryQuantity(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InventoryItem[]>(key);
      queryClient.setQueryData<InventoryItem[]>(key, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, quantity } : item)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRemoveInventoryItem(familyId: string) {
  const queryClient = useQueryClient();
  const key = inventoryKeys.list(familyId);

  return useMutation<void, Error, string, ListContext>({
    mutationFn: (id) => removeInventoryItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InventoryItem[]>(key);
      queryClient.setQueryData<InventoryItem[]>(key, (old = []) =>
        old.filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Ajout groupé de produits scannés à l'inventaire. */
export function useAddScannedItems(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { name: string; quantity: number }[]) =>
      addInventoryItemsBatch(familyId, items),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.list(familyId) });
    },
  });
}

/** Pont courses -> inventaire : impacte les deux listes. */
export function useAddCheckedItemsToInventory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ShoppingItem[]) => addCheckedItemsToInventory(familyId, items),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.list(familyId) });
      void queryClient.invalidateQueries({ queryKey: shoppingKeys.list(familyId) });
    },
  });
}
