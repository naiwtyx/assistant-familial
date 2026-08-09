/**
 * Partie PURE de la couche d'actions IA : types + validation "de forme" +
 * libellés humains. Aucun accès base, aucun `server-only` -> directement
 * testable. L'exécution (accès Supabase) vit dans `actions.ts`.
 */

export type WriteActionType =
  | "add_shopping_item"
  | "remove_shopping_item"
  | "update_inventory"
  | "plan_meal"
  | "plan_week"
  | "create_recipe"
  | "add_chore"
  | "add_event"
  | "add_idea";

/** Action proposée par l'IA, en attente de confirmation utilisateur. */
export type ProposedAction = {
  id: string;
  type: WriteActionType;
  label: string;
  params: Record<string, unknown>;
};

/** De quoi annuler une action exécutée. `null` = non annulable. */
export type UndoSpec =
  | {
      kind: "delete_rows";
      table: "shopping_items" | "chores" | "events" | "suggestions" | "recipes";
      ids: string[];
    }
  | { kind: "clear_meal"; date: string; slot: "midi" | "soir" }
  | { kind: "clear_meals"; slots: { date: string; slot: "midi" | "soir" }[] }
  | { kind: "restore_inventory_qty"; id: string; quantity: number }
  | null;

export type ExecutedAction = {
  id: string;
  label: string;
  ok: boolean;
  summary: string;
  undo: UndoSpec;
  /** Actions proposées EN SUITE de celle-ci (ex. ajouter les ingrédients manquants). */
  followup?: ProposedAction[];
};

const WRITE_TOOL_TO_ACTION: Record<string, WriteActionType> = {
  addShoppingItem: "add_shopping_item",
  removeShoppingItem: "remove_shopping_item",
  updateInventory: "update_inventory",
  planMeal: "plan_meal",
  createRecipe: "create_recipe",
  addChore: "add_chore",
  addEvent: "add_event",
  addIdea: "add_idea",
};

/** Nom d'outil LLM -> type d'action géré par cette couche (ou null si non géré). */
export function writeToolToActionType(toolName: string): WriteActionType | null {
  return WRITE_TOOL_TO_ACTION[toolName] ?? null;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const HH_MM = /^\d{2}:\d{2}/;

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
export function asSlot(value: unknown): "midi" | "soir" | null {
  return value === "midi" || value === "soir" ? value : null;
}

export function formatActionDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
}

export type BuildResult = { ok: true; action: ProposedAction } | { ok: false; error: string };

let actionCounter = 0;
function nextId(): string {
  actionCounter += 1;
  return `act_${Date.now().toString(36)}_${actionCounter}`;
}

/**
 * Valide les paramètres bruts venant du LLM et construit une action proposée
 * avec un libellé humain. Validation "de forme" uniquement (les vérifs
 * base — recette/membre existants — se font à l'exécution). Retourne une
 * erreur claire que le LLM peut corriger.
 */
export function buildProposedAction(toolName: string, rawParams: Record<string, unknown>): BuildResult {
  const type = writeToolToActionType(toolName);
  if (!type) return { ok: false, error: `Outil d'écriture inconnu : ${toolName}` };

  switch (type) {
    case "add_shopping_item": {
      const name = asString(rawParams.name).trim();
      if (!name) return { ok: false, error: "Nom d'article manquant." };
      const quantity = Math.max(1, Math.round(asNumber(rawParams.quantity, 1)));
      const unit = rawParams.unit ? asString(rawParams.unit).trim() : null;
      const label = `Ajouter ${quantity > 1 ? `${quantity} ` : ""}${unit ? `${unit} ` : ""}${name} aux courses`;
      return { ok: true, action: { id: nextId(), type, label, params: { name, quantity, unit } } };
    }
    case "remove_shopping_item": {
      const name = asString(rawParams.name).trim();
      if (!name) return { ok: false, error: "Nom d'article manquant." };
      return { ok: true, action: { id: nextId(), type, label: `Retirer ${name} des courses`, params: { name } } };
    }
    case "update_inventory": {
      const name = asString(rawParams.name).trim();
      if (!name) return { ok: false, error: "Nom de produit manquant." };
      // Vérifie AVANT de clamper : sinon une quantité absente (sentinel -1)
      // serait remontée à 0 et passerait la validation.
      const rawQuantity = asNumber(rawParams.quantity, -1);
      if (rawQuantity < 0) return { ok: false, error: "Quantité manquante ou invalide." };
      const quantity = Math.round(rawQuantity);
      return {
        ok: true,
        action: { id: nextId(), type, label: `Mettre ${name} à ${quantity} en stock`, params: { name, quantity } },
      };
    }
    case "plan_meal": {
      const date = asString(rawParams.date);
      const slot = asSlot(rawParams.slot);
      const recipeName = asString(rawParams.recipeName).trim();
      if (!ISO_DATE.test(date)) return { ok: false, error: "Date invalide (AAAA-MM-JJ)." };
      if (!slot) return { ok: false, error: "Créneau invalide (midi ou soir)." };
      if (!recipeName) return { ok: false, error: "Nom de recette manquant." };
      return {
        ok: true,
        action: {
          id: nextId(),
          type,
          label: `Planifier ${recipeName} le ${formatActionDate(date)} (${slot})`,
          params: { date, slot, recipeName },
        },
      };
    }
    case "create_recipe": {
      const name = asString(rawParams.name).trim();
      if (!name) return { ok: false, error: "Nom de recette manquant." };
      const servings = Math.max(1, Math.round(asNumber(rawParams.servings, 4)));
      const rawIngredients = Array.isArray(rawParams.ingredients) ? rawParams.ingredients : [];
      const ingredients = rawIngredients
        .map((item) => {
          const ing = item as Record<string, unknown>;
          return {
            name: asString(ing.name).trim(),
            quantity: asNumber(ing.quantity, 1),
            unit: ing.unit ? asString(ing.unit).trim() : null,
          };
        })
        .filter((ing) => ing.name.length > 0);
      const label =
        ingredients.length > 0
          ? `Créer la recette « ${name} » (${ingredients.length} ingrédient(s), ${servings} pers.)`
          : `Créer la recette « ${name} » (${servings} pers.)`;
      return { ok: true, action: { id: nextId(), type, label, params: { name, servings, ingredients } } };
    }
    case "add_chore": {
      const title = asString(rawParams.title).trim();
      if (!title) return { ok: false, error: "Intitulé de tâche manquant." };
      const assigneeName = rawParams.assigneeName ? asString(rawParams.assigneeName).trim() : null;
      const dueDate =
        typeof rawParams.dueDate === "string" && ISO_DATE.test(rawParams.dueDate) ? rawParams.dueDate : null;
      const points = Math.min(10, Math.max(1, Math.round(asNumber(rawParams.points, 1))));
      const recurrence =
        rawParams.recurrence === "daily" || rawParams.recurrence === "weekly" ? rawParams.recurrence : null;
      const label = `Créer la tâche « ${title} »${assigneeName ? ` pour ${assigneeName}` : ""}`;
      return { ok: true, action: { id: nextId(), type, label, params: { title, assigneeName, dueDate, points, recurrence } } };
    }
    case "add_event": {
      const title = asString(rawParams.title).trim();
      const date = asString(rawParams.date);
      if (!title) return { ok: false, error: "Titre d'événement manquant." };
      if (!ISO_DATE.test(date)) return { ok: false, error: "Date invalide (AAAA-MM-JJ)." };
      const time = typeof rawParams.time === "string" && HH_MM.test(rawParams.time) ? rawParams.time : null;
      const note = rawParams.note ? asString(rawParams.note).trim() : null;
      const label = `Ajouter « ${title} » le ${formatActionDate(date)}${time ? ` à ${time}` : ""}`;
      return { ok: true, action: { id: nextId(), type, label, params: { title, date, time, note } } };
    }
    case "add_idea": {
      const content = asString(rawParams.content).trim();
      if (!content) return { ok: false, error: "Contenu de l'idée manquant." };
      return { ok: true, action: { id: nextId(), type, label: `Ajouter l'idée « ${content} »`, params: { content } } };
    }
    case "plan_week":
      // Construit directement par la route (via computeWeekPlan), pas depuis
      // des paramètres bruts du LLM.
      return { ok: false, error: "plan_week est construit par le serveur." };
  }
}

/** Fabrique un id d'action (exposé pour les actions construites côté serveur). */
export function newActionId(): string {
  return nextId();
}
