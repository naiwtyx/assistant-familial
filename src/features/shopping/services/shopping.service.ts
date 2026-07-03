import { createClient } from "@/lib/supabase/client";
import type { ShoppingItem } from "@/types/db";

import type { AddShoppingItemInput, UpdateShoppingItemInput } from "../schemas/shopping.schema";

/**
 * Couche métier "liste de courses". Fonctions pures et réutilisables
 * (UI temps réel + futur assistant IA : getShoppingList, addShoppingItem…).
 */

export async function getShoppingList(familyId: string): Promise<ShoppingItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("family_id", familyId)
    .order("is_checked", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addShoppingItem(
  familyId: string,
  input: AddShoppingItemInput,
): Promise<ShoppingItem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("shopping_items")
    .insert({
      family_id: familyId,
      name: input.name,
      quantity: input.quantity,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Ajout groupé d'articles (ex. ingrédients manquants d'une recette).
 * Si un article encore à acheter porte déjà le même nom, on incrémente sa
 * quantité au lieu de créer un doublon.
 */
export async function addShoppingItems(
  familyId: string,
  items: { name: string; quantity: number; unit: string | null }[],
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Articles encore à acheter (non cochés), pour fusionner par nom.
  const { data: existing, error: existingError } = await supabase
    .from("shopping_items")
    .select("id,name,quantity")
    .eq("family_id", familyId)
    .eq("is_checked", false);
  if (existingError) throw existingError;

  const normalize = (name: string) => name.trim().toLowerCase();
  const byName = new Map(
    (existing ?? []).map((item) => [normalize(item.name), { id: item.id, quantity: item.quantity }]),
  );

  const toInsert: {
    family_id: string;
    name: string;
    quantity: number;
    unit: string | null;
    created_by: string | null;
  }[] = [];

  for (const item of items) {
    const match = byName.get(normalize(item.name));
    if (match) {
      const { error } = await supabase
        .from("shopping_items")
        .update({ quantity: match.quantity + item.quantity })
        .eq("id", match.id);
      if (error) throw error;
      match.quantity += item.quantity;
    } else {
      toInsert.push({
        family_id: familyId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        created_by: user?.id ?? null,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("shopping_items").insert(toInsert);
    if (error) throw error;
  }
}

export async function updateShoppingItem(
  id: string,
  patch: UpdateShoppingItemInput,
): Promise<ShoppingItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setShoppingItemChecked(
  id: string,
  isChecked: boolean,
): Promise<ShoppingItem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("shopping_items")
    .update({
      is_checked: isChecked,
      checked_at: isChecked ? new Date().toISOString() : null,
      checked_by: isChecked ? (user?.id ?? null) : null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeShoppingItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}
