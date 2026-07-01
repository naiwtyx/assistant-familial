import { createClient } from "@/lib/supabase/client";
import type { InventoryItem, ShoppingItem } from "@/types/db";

import type { InventoryItemInput } from "../schemas/inventory.schema";

/**
 * Couche métier "inventaire". Fonctions pures et réutilisables
 * (UI temps réel + futur assistant IA : getInventory, addInventoryItem, updateInventory…).
 */

function toRow(familyId: string, input: InventoryItemInput) {
  return {
    family_id: familyId,
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    unit: input.unit,
    location: input.location,
    expiry_date: input.expiryDate && input.expiryDate.length > 0 ? input.expiryDate : null,
  };
}

export async function getInventory(familyId: string): Promise<InventoryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("family_id", familyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addInventoryItem(
  familyId: string,
  input: InventoryItemInput,
): Promise<InventoryItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert(toRow(familyId, input))
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  familyId: string,
  id: string,
  input: InventoryItemInput,
): Promise<InventoryItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update(toRow(familyId, input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setInventoryQuantity(id: string, quantity: number): Promise<InventoryItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ quantity })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeInventoryItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Ajout groupé de produits (ex. issus d'un ticket scanné). Emplacement "placard"
 * par défaut ; catégorie/unité laissées vides (ajustables ensuite).
 */
export async function addInventoryItemsBatch(
  familyId: string,
  items: { name: string; quantity: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();
  const rows = items.map((item) => ({
    family_id: familyId,
    name: item.name,
    quantity: item.quantity,
    category: null,
    unit: null,
    location: "pantry",
    expiry_date: null,
  }));
  const { error } = await supabase.from("inventory_items").insert(rows);
  if (error) throw error;
}

/**
 * Pont courses -> inventaire : bascule les articles cochés vers l'inventaire
 * (emplacement "placard" par défaut) puis les retire de la liste de courses.
 */
export async function addCheckedItemsToInventory(
  familyId: string,
  items: ShoppingItem[],
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();

  const rows = items.map((item) => ({
    family_id: familyId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    location: "pantry",
    expiry_date: null,
  }));

  const { error: insertError } = await supabase.from("inventory_items").insert(rows);
  if (insertError) throw insertError;

  const { error: deleteError } = await supabase
    .from("shopping_items")
    .delete()
    .in(
      "id",
      items.map((item) => item.id),
    );
  if (deleteError) throw deleteError;
}
