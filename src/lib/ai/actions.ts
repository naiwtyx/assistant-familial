import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import {
  asNumber,
  asSlot,
  asString,
  buildProposedAction,
  HH_MM,
  ISO_DATE,
  type ProposedAction,
  type UndoSpec,
  type WriteActionType,
} from "./actions-schema";

// Ré-exporte la partie pure pour que les appelants aient un point d'entrée unique.
export {
  buildProposedAction,
  writeToolToActionType,
  type ExecutedAction,
  type ProposedAction,
  type UndoSpec,
  type WriteActionType,
} from "./actions-schema";

type Db = SupabaseClient<Database>;

type ExecResult =
  | { ok: true; summary: string; undo: UndoSpec; followup?: ProposedAction[] }
  | { ok: false; error: string };

/**
 * Exécute une action DÉJÀ confirmée. Refait une validation défensive (on ne
 * fait jamais confiance aveuglément à l'entrée — section 18) puis effectue
 * l'opération Supabase (scopée famille + RLS). Retourne un résumé + de quoi
 * annuler.
 */
export async function executeAction(
  supabase: Db,
  familyId: string,
  userId: string,
  type: WriteActionType,
  params: Record<string, unknown>,
): Promise<ExecResult> {
  switch (type) {
    case "add_shopping_item": {
      const name = asString(params.name).trim();
      if (!name) return { ok: false, error: "Nom d'article manquant." };
      const quantity = Math.max(1, Math.round(asNumber(params.quantity, 1)));
      const unit = params.unit ? asString(params.unit).trim() || null : null;
      const { data, error } = await supabase
        .from("shopping_items")
        .insert({ family_id: familyId, name, quantity, unit, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      return {
        ok: true,
        summary: `${name} ajouté aux courses`,
        undo: { kind: "delete_rows", table: "shopping_items", ids: [data.id] },
      };
    }
    case "remove_shopping_item": {
      const name = asString(params.name).trim();
      const { data, error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("family_id", familyId)
        .ilike("name", name)
        .select("id");
      if (error) throw error;
      if ((data?.length ?? 0) === 0) return { ok: false, error: `Aucun article « ${name} » à retirer.` };
      return { ok: true, summary: `${name} retiré des courses`, undo: null };
    }
    case "update_inventory": {
      const name = asString(params.name).trim();
      const quantity = Math.max(0, Math.round(asNumber(params.quantity, 0)));
      const { data: existing, error: findError } = await supabase
        .from("inventory_items")
        .select("id,quantity")
        .eq("family_id", familyId)
        .ilike("name", name)
        .limit(1);
      if (findError) throw findError;
      const item = existing?.[0];
      if (!item) return { ok: false, error: `Aucun produit « ${name} » dans l'inventaire.` };
      const { error } = await supabase.from("inventory_items").update({ quantity }).eq("id", item.id);
      if (error) throw error;
      return {
        ok: true,
        summary: `${name} : stock mis à ${quantity}`,
        undo: { kind: "restore_inventory_qty", id: item.id, quantity: item.quantity },
      };
    }
    case "plan_meal": {
      const date = asString(params.date);
      const slot = asSlot(params.slot);
      const recipeName = asString(params.recipeName).trim();
      if (!ISO_DATE.test(date) || !slot || !recipeName) return { ok: false, error: "Paramètres de repas invalides." };
      const { data: recipes, error: recipeError } = await supabase
        .from("recipes")
        .select("id,name")
        .eq("family_id", familyId)
        .ilike("name", recipeName)
        .limit(1);
      if (recipeError) throw recipeError;
      const recipe = recipes?.[0];
      if (!recipe) return { ok: false, error: `Recette « ${recipeName} » introuvable.` };
      const { error } = await supabase
        .from("meal_plans")
        .upsert(
          { family_id: familyId, date, slot, recipe_id: recipe.id, created_by: userId },
          { onConflict: "family_id,date,slot" },
        );
      if (error) throw error;
      return { ok: true, summary: `${recipe.name} planifié (${slot})`, undo: { kind: "clear_meal", date, slot } };
    }
    case "plan_week": {
      const rawSlots = Array.isArray(params.slots) ? params.slots : [];
      const slots = rawSlots
        .map((entry) => {
          const o = entry as Record<string, unknown>;
          return { date: asString(o.date), slot: asSlot(o.slot), recipeId: asString(o.recipeId) };
        })
        .filter(
          (s): s is { date: string; slot: "midi" | "soir"; recipeId: string } =>
            ISO_DATE.test(s.date) && s.slot !== null && s.recipeId.length > 0,
        );
      if (slots.length === 0) return { ok: false, error: "Aucun repas valide à planifier." };

      const rows = slots.map((s) => ({
        family_id: familyId,
        date: s.date,
        slot: s.slot,
        recipe_id: s.recipeId,
        created_by: userId,
      }));
      const { error } = await supabase.from("meal_plans").upsert(rows, { onConflict: "family_id,date,slot" });
      if (error) throw error;

      // Ingrédients manquants -> propositions d'ajout aux courses (2ᵉ confirmation).
      const rawMissing = Array.isArray(params.missing) ? params.missing : [];
      const followup: ProposedAction[] = [];
      for (const entry of rawMissing) {
        const o = entry as Record<string, unknown>;
        const built = buildProposedAction("addShoppingItem", {
          name: asString(o.name),
          quantity: asNumber(o.quantity, 1),
          unit: o.unit ?? null,
        });
        if (built.ok) followup.push(built.action);
      }

      return {
        ok: true,
        summary: `Semaine planifiée (${slots.length} repas)`,
        undo: { kind: "clear_meals", slots: slots.map((s) => ({ date: s.date, slot: s.slot })) },
        followup: followup.length > 0 ? followup : undefined,
      };
    }
    case "create_recipe": {
      const name = asString(params.name).trim();
      if (!name) return { ok: false, error: "Nom de recette manquant." };
      const servings = Math.max(1, Math.round(asNumber(params.servings, 4)));
      const rawIngredients = Array.isArray(params.ingredients) ? params.ingredients : [];
      const ingredients = rawIngredients
        .map((item) => {
          const ing = item as Record<string, unknown>;
          return {
            name: asString(ing.name).trim(),
            quantity: asNumber(ing.quantity, 1),
            unit: ing.unit ? asString(ing.unit).trim() || null : null,
          };
        })
        .filter((ing) => ing.name.length > 0);
      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({ family_id: familyId, name, servings, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      if (ingredients.length > 0) {
        const rows = ingredients.map((ing, index) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          sort_order: index,
        }));
        const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
        if (ingError) {
          await supabase.from("recipes").delete().eq("id", recipe.id);
          throw ingError;
        }
      }
      return { ok: true, summary: `Recette « ${name} » créée`, undo: { kind: "delete_rows", table: "recipes", ids: [recipe.id] } };
    }
    case "add_chore": {
      const title = asString(params.title).trim();
      if (!title) return { ok: false, error: "Intitulé de tâche manquant." };
      let assignedTo: string | null = null;
      const assigneeName = params.assigneeName ? asString(params.assigneeName).trim() : "";
      if (assigneeName) {
        const members = await familyProfiles(supabase, familyId);
        const match = members.find((m) => m.name.trim().toLowerCase() === assigneeName.toLowerCase());
        if (!match) return { ok: false, error: `Aucun membre nommé « ${assigneeName} ».` };
        assignedTo = match.id;
      }
      const dueDate = typeof params.dueDate === "string" && ISO_DATE.test(params.dueDate) ? params.dueDate : null;
      const points = Math.min(10, Math.max(1, Math.round(asNumber(params.points, 1))));
      const recurrence = params.recurrence === "daily" || params.recurrence === "weekly" ? params.recurrence : null;
      const { data, error } = await supabase
        .from("chores")
        .insert({
          family_id: familyId,
          title,
          assignee_ids: assignedTo ? [assignedTo] : [],
          due_date: dueDate,
          points,
          recurrence,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, summary: `Tâche « ${title} » créée`, undo: { kind: "delete_rows", table: "chores", ids: [data.id] } };
    }
    case "add_event": {
      const title = asString(params.title).trim();
      const date = asString(params.date);
      if (!title || !ISO_DATE.test(date)) return { ok: false, error: "Titre ou date d'événement invalide." };
      const time = typeof params.time === "string" && HH_MM.test(params.time) ? params.time : null;
      const note = params.note ? asString(params.note).trim() || null : null;
      const { data, error } = await supabase
        .from("events")
        .insert({ family_id: familyId, title, event_date: date, event_time: time, note, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, summary: `« ${title} » ajouté à l'agenda`, undo: { kind: "delete_rows", table: "events", ids: [data.id] } };
    }
    case "add_idea": {
      const content = asString(params.content).trim();
      if (!content) return { ok: false, error: "Contenu de l'idée manquant." };
      const { data, error } = await supabase
        .from("suggestions")
        .insert({ family_id: familyId, content, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, summary: `Idée « ${content} » ajoutée`, undo: { kind: "delete_rows", table: "suggestions", ids: [data.id] } };
    }
  }
}

/** Annule une action précédemment exécutée. Best-effort, jamais bloquant. */
export async function runUndo(supabase: Db, familyId: string, undo: UndoSpec): Promise<void> {
  if (!undo) return;
  if (undo.kind === "delete_rows") {
    await supabase.from(undo.table).delete().eq("family_id", familyId).in("id", undo.ids);
    return;
  }
  if (undo.kind === "clear_meal") {
    await supabase.from("meal_plans").delete().eq("family_id", familyId).eq("date", undo.date).eq("slot", undo.slot);
    return;
  }
  if (undo.kind === "clear_meals") {
    for (const slot of undo.slots) {
      await supabase
        .from("meal_plans")
        .delete()
        .eq("family_id", familyId)
        .eq("date", slot.date)
        .eq("slot", slot.slot);
    }
    return;
  }
  if (undo.kind === "restore_inventory_qty") {
    await supabase.from("inventory_items").update({ quantity: undo.quantity }).eq("id", undo.id).eq("family_id", familyId);
  }
}

/** Prénoms + identifiants des membres de la famille. */
async function familyProfiles(supabase: Db, familyId: string): Promise<{ id: string; name: string }[]> {
  const { data: members } = await supabase.from("family_members").select("user_id").eq("family_id", familyId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", ids);
  return (profiles ?? []).map((p) => ({ id: p.id, name: p.display_name }));
}
