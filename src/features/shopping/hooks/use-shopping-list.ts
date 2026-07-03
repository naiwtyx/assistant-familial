"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { ShoppingItem } from "@/types/db";

import type { AddShoppingItemInput, UpdateShoppingItemInput } from "../schemas/shopping.schema";
import {
  addShoppingItem,
  addShoppingItems,
  getShoppingList,
  removeShoppingItem,
  setShoppingItemChecked,
  updateShoppingItem,
} from "../services/shopping.service";

export const shoppingKeys = {
  list: (familyId: string) => ["shopping-items", familyId] as const,
};

type ListContext = { previous?: ShoppingItem[] };

/**
 * Liste de courses en temps réel.
 * - `useQuery` charge la liste et la met en cache.
 * - Un canal Supabase Realtime écoute les changements de la famille et invalide
 *   le cache : tout appareil voit les modifications des autres quasi instantanément.
 */
export function useShoppingList(familyId: string) {
  const query = useQuery({
    queryKey: shoppingKeys.list(familyId),
    queryFn: () => getShoppingList(familyId),
  });

  useRealtimeTable("shopping_items", familyId, shoppingKeys.list(familyId));

  return query;
}

/** Ajout groupé (ex. ingrédients manquants d'une recette). */
export function useAddShoppingItems(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { name: string; quantity: number; unit: string | null }[]) =>
      addShoppingItems(familyId, items),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingKeys.list(familyId) });
    },
  });
}

/** Ajout optimiste : l'article apparaît immédiatement, avant la confirmation serveur. */
export function useAddShoppingItem(familyId: string) {
  const queryClient = useQueryClient();
  const key = shoppingKeys.list(familyId);

  return useMutation<ShoppingItem, Error, AddShoppingItemInput, ListContext>({
    mutationFn: (input) => addShoppingItem(familyId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      const now = new Date().toISOString();
      const optimistic: ShoppingItem = {
        id: `temp-${crypto.randomUUID()}`,
        family_id: familyId,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit && input.unit.length > 0 ? input.unit : null,
        category: null,
        is_checked: false,
        checked_by: null,
        checked_at: null,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<ShoppingItem[]>(key, (old = []) => [...old, optimistic]);
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

export function useSetShoppingItemChecked(familyId: string) {
  const queryClient = useQueryClient();
  const key = shoppingKeys.list(familyId);

  return useMutation<ShoppingItem, Error, { id: string; isChecked: boolean }, ListContext>({
    mutationFn: ({ id, isChecked }) => setShoppingItemChecked(id, isChecked),
    onMutate: async ({ id, isChecked }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old = []) =>
        old.map((item) =>
          item.id === id
            ? { ...item, is_checked: isChecked, checked_at: isChecked ? new Date().toISOString() : null }
            : item,
        ),
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

export function useUpdateShoppingItem(familyId: string) {
  const queryClient = useQueryClient();
  const key = shoppingKeys.list(familyId);

  return useMutation<ShoppingItem, Error, { id: string; patch: UpdateShoppingItemInput }, ListContext>({
    mutationFn: ({ id, patch }) => updateShoppingItem(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, ...patch } : item)),
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

export function useRemoveShoppingItem(familyId: string) {
  const queryClient = useQueryClient();
  const key = shoppingKeys.list(familyId);

  return useMutation<void, Error, string, ListContext>({
    mutationFn: (id) => removeShoppingItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old = []) => old.filter((item) => item.id !== id));
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
