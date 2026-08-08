import "server-only";

import type Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { aggregateReceiptItems, type CategoryTotal } from "@/features/budget/lib/aggregate";
import { compareMonthlySpending, significantIncreases } from "@/features/budget/lib/budget-insights";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import { normalizeName } from "@/lib/normalize";
import type { Database } from "@/types/database.types";

type Db = SupabaseClient<Database>;
type Executor = (args: Record<string, unknown>) => Promise<string>;

/**
 * Déclarations des fonctions exposées à l'IA (format OpenAI/Groq). Elles
 * décrivent ce que l'assistant peut faire ; l'exécution réelle est dans
 * buildExecutors.
 */
export const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getShoppingList",
      description: "Récupère la liste de courses de la famille (à acheter et déjà pris).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "addShoppingItem",
      description: "Ajoute un article à la liste de courses.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de l'article" },
          quantity: { type: "number", description: "Quantité (1 par défaut)" },
          unit: { type: "string", description: "Unité, ex. kg, L, paquet" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeShoppingItem",
      description: "Supprime un article de la liste de courses par son nom.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Nom de l'article à supprimer" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventory",
      description: "Récupère l'inventaire de la maison (produits en stock).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "updateInventory",
      description: "Met à jour la quantité d'un produit de l'inventaire (recherché par son nom).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom du produit" },
          quantity: { type: "number", description: "Nouvelle quantité" },
        },
        required: ["name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRecipes",
      description: "Liste les recettes de la famille (nom, nombre de personnes).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createRecipe",
      description:
        "Crée une nouvelle recette. Les ingrédients sont optionnels : l'utilisateur peut créer une recette au titre seul et compléter plus tard.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom de la recette" },
          servings: { type: "number", description: "Nombre de personnes (4 par défaut)" },
          ingredients: {
            type: "array",
            description: "Liste des ingrédients (optionnel — laisser vide pour créer sans)",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMealPlan",
      description:
        "Récupère les repas planifiés entre deux dates incluses (format AAAA-MM-JJ).",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Date de début, AAAA-MM-JJ" },
          endDate: { type: "string", description: "Date de fin, AAAA-MM-JJ" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "planMeal",
      description:
        "Planifie une recette existante pour un repas (midi ou soir) à une date. Vérifie les recettes avec getRecipes si besoin.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du repas, AAAA-MM-JJ" },
          slot: { type: "string", enum: ["midi", "soir"], description: "Créneau du repas" },
          recipeName: { type: "string", description: "Nom de la recette à planifier" },
        },
        required: ["date", "slot", "recipeName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clearMeal",
      description: "Retire le repas planifié pour une date et un créneau (midi ou soir).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du repas, AAAA-MM-JJ" },
          slot: { type: "string", enum: ["midi", "soir"], description: "Créneau du repas" },
        },
        required: ["date", "slot"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "planWeek",
      description:
        "Planifie automatiquement les 14 repas (midi + soir) de 7 jours à partir d'une date, en utilisant les recettes existantes et en priorisant celles dont des ingrédients périment bientôt dans l'inventaire. Écrase les créneaux déjà planifiés sur la période. Nécessite au moins une recette (getRecipes/createRecipe).",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Date de début AAAA-MM-JJ (souvent aujourd'hui ou demain)",
          },
        },
        required: ["startDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getChores",
      description: "Liste les tâches/corvées de la famille (intitulé, assignée à, faite, points).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "addChore",
      description:
        "Crée une tâche/corvée. Assigne-la à un membre par son prénom si demandé (vérifie les prénoms avec getFamilyMembers).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Intitulé de la tâche" },
          assigneeName: { type: "string", description: "Prénom du membre assigné (optionnel)" },
          dueDate: { type: "string", description: "Échéance AAAA-MM-JJ (optionnel)" },
          points: { type: "number", description: "Points (1 par défaut)" },
          recurrence: {
            type: "string",
            enum: ["daily", "weekly"],
            description: "Répétition (optionnel)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setChoreDone",
      description:
        "Marque une tâche/corvée comme faite ou à faire, retrouvée par son intitulé exact (vérifie avec getChores si besoin).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Intitulé de la tâche" },
          done: { type: "boolean", description: "true = faite, false = à refaire (true par défaut)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteChore",
      description: "Supprime une tâche/corvée par son intitulé exact.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Intitulé de la tâche à supprimer" } },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reassignChore",
      description: "Réassigne une tâche/corvée existante à un autre membre par son prénom.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Intitulé de la tâche" },
          assigneeName: {
            type: "string",
            description: "Prénom du nouveau membre assigné (vérifie avec getFamilyMembers)",
          },
        },
        required: ["title", "assigneeName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFamilyMembers",
      description: "Liste les prénoms des membres de la famille (pour assigner des tâches).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getEvents",
      description: "Liste les événements à venir de l'agenda familial.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "addEvent",
      description: "Ajoute un événement à l'agenda familial (rendez-vous, activité).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'événement" },
          date: { type: "string", description: "Date AAAA-MM-JJ" },
          time: { type: "string", description: "Heure HH:MM (optionnel)" },
          note: { type: "string", description: "Note (optionnel)" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteEvent",
      description: "Supprime un événement de l'agenda par son titre et sa date.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'événement" },
          date: { type: "string", description: "Date AAAA-MM-JJ" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateEvent",
      description:
        "Modifie un événement existant (nouvelle date, heure ou note). Retrouvé par son titre et sa date actuelle.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de l'événement à modifier" },
          date: { type: "string", description: "Date actuelle de l'événement, AAAA-MM-JJ" },
          newDate: { type: "string", description: "Nouvelle date AAAA-MM-JJ (optionnel)" },
          newTime: { type: "string", description: "Nouvelle heure HH:MM (optionnel)" },
          newNote: { type: "string", description: "Nouvelle note (optionnel)" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getIdeas",
      description: "Liste les idées/suggestions de la famille (contenu, faite ou non).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "addIdea",
      description: "Ajoute une idée/suggestion au tableau de la famille.",
      parameters: {
        type: "object",
        properties: { content: { type: "string", description: "Contenu de l'idée" } },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMonthlySpending",
      description:
        "Total des dépenses (tickets scannés) d'un mois, par catégorie, avec comparaison au mois précédent et catégories en forte hausse. Réservé aux parents.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number", description: "Année, ex. 2026 (année courante par défaut)" },
          month: { type: "number", description: "Mois 1-12 (mois courant par défaut)" },
        },
      },
    },
  },
];

/**
 * Routage d'outils : plutôt que d'envoyer les 24 outils à chaque requête (ce
 * qui fait rater le tool-calling de Llama), on ne transmet que ceux pertinents
 * pour la demande. L'assistant garde TOUTES ses capacités — on lui évite juste
 * de choisir parmi trop d'options d'un coup (plus fiable + plus rapide).
 */
const TOOL_CATEGORIES: Record<string, string[]> = {
  shopping: ["getShoppingList", "addShoppingItem", "removeShoppingItem"],
  inventory: ["getInventory", "updateInventory"],
  recipes: ["getRecipes", "createRecipe"],
  meals: ["getMealPlan", "planMeal", "clearMeal", "planWeek"],
  chores: ["getChores", "addChore", "setChoreDone", "deleteChore", "reassignChore"],
  events: ["getEvents", "addEvent", "deleteEvent", "updateEvent"],
  ideas: ["getIdeas", "addIdea"],
  budget: ["getMonthlySpending"],
  family: ["getFamilyMembers"],
};

// Mots-clés (sans accents — comparés au texte normalisé) qui activent une
// catégorie. Substring : « cuisin » attrape cuisiner/cuisine.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shopping: ["cours", "achet", "liste", "panier", "article"],
  inventory: ["stock", "inventaire", "frigo", "placard", "perim", "expire", "reserve", "congel"],
  recipes: ["recette", "cuisin", "plat ", "ingredient"],
  meals: ["repas", "diner", "dejeuner", "midi", "soir", "manger", "menu", "planifi", "planning", "semaine"],
  chores: ["tache", "corvee", "menage", "classement", "point", "assign", "poubelle", "vaisselle", "ranger"],
  events: ["agenda", "evenement", "rendez", "rdv", "calendrier", "sortie", "activite", "anniversaire"],
  ideas: ["idee", "suggestion", "envie"],
  budget: ["budget", "depense", "argent", "cout", "prix", "ticket", "euro"],
};

const DEFAULT_CATEGORIES = ["shopping", "inventory", "recipes", "meals", "chores", "events", "family"];

/** Sélectionne les outils pertinents pour un message (garde toutes les capacités). */
export function selectTools(userText: string): Groq.Chat.Completions.ChatCompletionTool[] {
  const text = normalizeName(userText);
  const matched = new Set<string>();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) matched.add(category);
  }

  // Co-activation : les modules "cuisine" se raisonnent ensemble (recettes ↔
  // stock ↔ repas), les courses ont besoin du stock (éviter les doublons),
  // les tâches ont besoin des prénoms pour l'assignation.
  if (matched.has("recipes") || matched.has("meals")) {
    matched.add("recipes");
    matched.add("meals");
    matched.add("inventory");
  }
  if (matched.has("shopping")) matched.add("inventory");
  if (matched.has("chores")) matched.add("family");

  // Rien de reconnu (salutation, question vague) -> cœur du quotidien.
  const categories = matched.size > 0 ? matched : new Set(DEFAULT_CATEGORIES);

  const names = new Set<string>();
  for (const category of categories) {
    for (const name of TOOL_CATEGORIES[category] ?? []) names.add(name);
  }
  return tools.filter((tool) => tool.function?.name != null && names.has(tool.function.name));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function asSlot(value: unknown): "midi" | "soir" | null {
  return value === "midi" || value === "soir" ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Implémentations des outils. Exécutées CÔTÉ SERVEUR avec le client Supabase de
 * l'utilisateur : les RLS et le filtrage par famille s'appliquent — l'IA ne peut
 * jamais sortir des données de sa famille.
 */
export function buildExecutors(supabase: Db, familyId: string, userId: string): Record<string, Executor> {
  return {
    getShoppingList: async () => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("name,quantity,unit,is_checked")
        .eq("family_id", familyId)
        .order("is_checked")
        .order("created_at");
      if (error) throw error;
      return JSON.stringify(data);
    },

    addShoppingItem: async (args) => {
      const name = asString(args.name);
      if (!name) return "Nom d'article manquant.";
      const quantity = asNumber(args.quantity, 1);
      const unit = args.unit ? asString(args.unit) : null;
      const { error } = await supabase.from("shopping_items").insert({
        family_id: familyId,
        name,
        quantity,
        unit,
        created_by: userId,
      });
      if (error) throw error;
      return `Ajouté à la liste de courses : ${quantity} ${unit ?? ""} ${name}`.replace(/\s+/g, " ").trim();
    },

    removeShoppingItem: async (args) => {
      const name = asString(args.name);
      const { data, error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("family_id", familyId)
        .ilike("name", name)
        .select("id");
      if (error) throw error;
      return `Supprimé : ${data?.length ?? 0} article(s) « ${name} ».`;
    },

    getInventory: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("name,category,quantity,unit,location,expiry_date")
        .eq("family_id", familyId)
        .order("name");
      if (error) throw error;
      return JSON.stringify(data);
    },

    updateInventory: async (args) => {
      const name = asString(args.name);
      const quantity = asNumber(args.quantity, 0);
      const { data, error } = await supabase
        .from("inventory_items")
        .update({ quantity })
        .eq("family_id", familyId)
        .ilike("name", name)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) return `Aucun produit « ${name} » trouvé dans l'inventaire.`;
      return `Quantité de « ${name} » mise à jour : ${quantity}.`;
    },

    getRecipes: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,servings")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return JSON.stringify(data);
    },

    createRecipe: async (args) => {
      const name = asString(args.name);
      const servings = Math.max(1, Math.round(asNumber(args.servings, 4)));
      const rawIngredients = Array.isArray(args.ingredients) ? args.ingredients : [];
      const ingredients = rawIngredients
        .map((item) => {
          const ingredient = item as Record<string, unknown>;
          return {
            name: asString(ingredient.name),
            quantity: asNumber(ingredient.quantity, 1),
            unit: ingredient.unit ? asString(ingredient.unit) : null,
          };
        })
        .filter((ingredient) => ingredient.name.length > 0);

      if (!name) return "Nom de recette manquant.";

      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({ family_id: familyId, name, servings, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      if (ingredients.length > 0) {
        const rows = ingredients.map((ingredient, index) => ({
          recipe_id: recipe.id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          sort_order: index,
        }));
        const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(rows);
        if (ingredientsError) {
          await supabase.from("recipes").delete().eq("id", recipe.id);
          throw ingredientsError;
        }
      }

      return ingredients.length > 0
        ? `Recette « ${name} » créée pour ${servings} personnes (${ingredients.length} ingrédient(s)).`
        : `Recette « ${name} » créée pour ${servings} personnes (sans ingrédients — à compléter plus tard).`;
    },

    getMealPlan: async (args) => {
      const startDate = asString(args.startDate);
      const endDate = asString(args.endDate);
      if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
        return "Dates invalides (format attendu : AAAA-MM-JJ).";
      }
      const { data, error } = await supabase
        .from("meal_plans")
        .select("date,slot,recipe_id")
        .eq("family_id", familyId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");
      if (error) throw error;

      const recipeIds = [...new Set((data ?? []).map((m) => m.recipe_id).filter(Boolean))] as string[];
      const nameById = new Map<string, string>();
      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from("recipes")
          .select("id,name")
          .in("id", recipeIds);
        for (const recipe of recipes ?? []) nameById.set(recipe.id, recipe.name);
      }

      return JSON.stringify(
        (data ?? []).map((meal) => ({
          date: meal.date,
          slot: meal.slot,
          recipe: meal.recipe_id ? (nameById.get(meal.recipe_id) ?? null) : null,
        })),
      );
    },

    planMeal: async (args) => {
      const date = asString(args.date);
      const slot = asSlot(args.slot);
      const recipeName = asString(args.recipeName);
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      if (!slot) return "Le créneau doit être « midi » ou « soir ».";
      if (!recipeName) return "Nom de recette manquant.";

      const { data: recipes, error: recipeError } = await supabase
        .from("recipes")
        .select("id,name")
        .eq("family_id", familyId)
        .ilike("name", recipeName)
        .limit(1);
      if (recipeError) throw recipeError;
      const recipe = recipes?.[0];
      if (!recipe) {
        return `Aucune recette « ${recipeName} » trouvée. Crée-la d'abord ou vérifie le nom avec getRecipes.`;
      }

      const { error } = await supabase.from("meal_plans").upsert(
        { family_id: familyId, date, slot, recipe_id: recipe.id, created_by: userId },
        { onConflict: "family_id,date,slot" },
      );
      if (error) throw error;
      return `Repas planifié : « ${recipe.name} » le ${date} (${slot}).`;
    },

    clearMeal: async (args) => {
      const date = asString(args.date);
      const slot = asSlot(args.slot);
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      if (!slot) return "Le créneau doit être « midi » ou « soir ».";
      const { data, error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("family_id", familyId)
        .eq("date", date)
        .eq("slot", slot)
        .select("id");
      if (error) throw error;
      return `Repas retiré : ${data?.length ?? 0} créneau (${date}, ${slot}).`;
    },

    planWeek: async (args) => {
      const startDate = asString(args.startDate);
      if (!ISO_DATE.test(startDate)) return "Date de début invalide (format attendu : AAAA-MM-JJ).";

      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select("id,name")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (recipesError) throw recipesError;
      if (!recipes || recipes.length === 0) {
        return "Aucune recette disponible. Crée d'abord des recettes avec createRecipe.";
      }

      const { data: ingredients, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id,name")
        .in(
          "recipe_id",
          recipes.map((recipe) => recipe.id),
        );
      if (ingredientsError) throw ingredientsError;

      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("name,expiry_date")
        .eq("family_id", familyId);
      if (inventoryError) throw inventoryError;

      const expiringNames = new Set(
        (inventory ?? [])
          .filter((item) => {
            const status = getExpiryStatus(item.expiry_date);
            return status === "soon" || status === "expired";
          })
          .map((item) => normalizeName(item.name)),
      );

      const ingredientsByRecipe = new Map<string, string[]>();
      for (const ingredient of ingredients ?? []) {
        const list = ingredientsByRecipe.get(ingredient.recipe_id) ?? [];
        list.push(ingredient.name);
        ingredientsByRecipe.set(ingredient.recipe_id, list);
      }

      const scored = recipes
        .map((recipe) => {
          const names = ingredientsByRecipe.get(recipe.id) ?? [];
          const score = names.filter((name) => expiringNames.has(normalizeName(name))).length;
          return { ...recipe, score };
        })
        .sort((a, b) => b.score - a.score);

      const start = new Date(`${startDate}T00:00:00`);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + 6);
      const endIso = endDate.toISOString().slice(0, 10);

      const slots: { date: string; slot: "midi" | "soir" }[] = [];
      for (let day = 0; day < 7; day += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + day);
        const iso = date.toISOString().slice(0, 10);
        slots.push({ date: iso, slot: "midi" }, { date: iso, slot: "soir" });
      }

      const rows = slots.map((slot, index) => {
        const recipe = scored[index % scored.length]!;
        return {
          family_id: familyId,
          date: slot.date,
          slot: slot.slot,
          recipe_id: recipe.id,
          created_by: userId,
        };
      });

      const { error } = await supabase
        .from("meal_plans")
        .upsert(rows, { onConflict: "family_id,date,slot" });
      if (error) throw error;

      const prioritized = scored.filter((recipe) => recipe.score > 0).map((recipe) => recipe.name);
      const summary = `Semaine planifiée du ${startDate} au ${endIso} (14 repas, ${scored.length} recette(s) utilisée(s) en rotation).`;
      const priorityNote =
        prioritized.length > 0
          ? ` Priorité donnée aux recettes utilisant des produits qui périment bientôt : ${prioritized.join(", ")}.`
          : "";
      return summary + priorityNote;
    },

    getFamilyMembers: async () => {
      const members = await familyProfiles(supabase, familyId);
      return JSON.stringify(members.map((member) => ({ name: member.name })));
    },

    getChores: async () => {
      const { data, error } = await supabase
        .from("chores")
        .select("title,done,points,due_date,assignee_ids")
        .eq("family_id", familyId)
        .order("done")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const members = await familyProfiles(supabase, familyId);
      const nameById = new Map(members.map((member) => [member.id, member.name]));
      return JSON.stringify(
        (data ?? []).map((chore) => ({
          title: chore.title,
          done: chore.done,
          points: chore.points,
          dueDate: chore.due_date,
          assignees: chore.assignee_ids.map((id) => nameById.get(id) ?? "Membre"),
        })),
      );
    },

    addChore: async (args) => {
      const title = asString(args.title);
      if (!title) return "Intitulé de tâche manquant.";
      const assigneeName = args.assigneeName ? asString(args.assigneeName) : "";
      let assignedTo: string | null = null;
      if (assigneeName) {
        const members = await familyProfiles(supabase, familyId);
        const match = members.find(
          (member) => member.name.trim().toLowerCase() === assigneeName.trim().toLowerCase(),
        );
        if (!match) {
          return `Aucun membre nommé « ${assigneeName} ». Membres : ${members.map((m) => m.name).join(", ")}.`;
        }
        assignedTo = match.id;
      }
      const dueDate =
        typeof args.dueDate === "string" && ISO_DATE.test(args.dueDate) ? args.dueDate : null;
      const points = Math.min(10, Math.max(1, Math.round(asNumber(args.points, 1))));
      const recurrence =
        args.recurrence === "daily" || args.recurrence === "weekly" ? args.recurrence : null;

      const { error } = await supabase.from("chores").insert({
        family_id: familyId,
        title,
        assignee_ids: assignedTo ? [assignedTo] : [],
        due_date: dueDate,
        points,
        recurrence,
        created_by: userId,
      });
      if (error) throw error;
      return `Tâche « ${title} » créée${assigneeName ? ` pour ${assigneeName}` : ""}.`;
    },

    setChoreDone: async (args) => {
      const title = asString(args.title);
      if (!title) return "Intitulé de tâche manquant.";
      const done = typeof args.done === "boolean" ? args.done : true;
      const { data, error } = await supabase
        .from("chores")
        .update({ done, done_at: done ? new Date().toISOString() : null })
        .eq("family_id", familyId)
        .ilike("title", title)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) return `Aucune tâche « ${title} » trouvée.`;
      return `${data.length} tâche(s) « ${title} » marquée(s) ${done ? "faite(s)" : "à faire"}.`;
    },

    deleteChore: async (args) => {
      const title = asString(args.title);
      if (!title) return "Intitulé de tâche manquant.";
      const { data, error } = await supabase
        .from("chores")
        .delete()
        .eq("family_id", familyId)
        .ilike("title", title)
        .select("id");
      if (error) throw error;
      return `Supprimé : ${data?.length ?? 0} tâche(s) « ${title} ».`;
    },

    reassignChore: async (args) => {
      const title = asString(args.title);
      const assigneeName = asString(args.assigneeName);
      if (!title) return "Intitulé de tâche manquant.";
      if (!assigneeName) return "Prénom du nouveau membre manquant.";
      const members = await familyProfiles(supabase, familyId);
      const match = members.find(
        (member) => member.name.trim().toLowerCase() === assigneeName.trim().toLowerCase(),
      );
      if (!match) {
        return `Aucun membre nommé « ${assigneeName} ». Membres : ${members.map((m) => m.name).join(", ")}.`;
      }
      const { data, error } = await supabase
        .from("chores")
        .update({ assignee_ids: [match.id] })
        .eq("family_id", familyId)
        .ilike("title", title)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) return `Aucune tâche « ${title} » trouvée.`;
      return `Tâche « ${title} » réassignée à ${assigneeName}.`;
    },

    getEvents: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("events")
        .select("title,event_date,event_time,note")
        .eq("family_id", familyId)
        .gte("event_date", today)
        .order("event_date");
      if (error) throw error;
      return JSON.stringify(data);
    },

    addEvent: async (args) => {
      const title = asString(args.title);
      const date = asString(args.date);
      if (!title) return "Titre d'événement manquant.";
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      const time = typeof args.time === "string" && /^\d{2}:\d{2}/.test(args.time) ? args.time : null;
      const note = args.note ? asString(args.note) : null;

      const { error } = await supabase.from("events").insert({
        family_id: familyId,
        title,
        event_date: date,
        event_time: time,
        note,
        created_by: userId,
      });
      if (error) throw error;
      return `Événement « ${title} » ajouté à l'agenda le ${date}${time ? ` à ${time}` : ""}.`;
    },

    deleteEvent: async (args) => {
      const title = asString(args.title);
      const date = asString(args.date);
      if (!title) return "Titre d'événement manquant.";
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";
      const { data, error } = await supabase
        .from("events")
        .delete()
        .eq("family_id", familyId)
        .eq("event_date", date)
        .ilike("title", title)
        .select("id");
      if (error) throw error;
      return `Supprimé : ${data?.length ?? 0} événement(s) « ${title} » le ${date}.`;
    },

    updateEvent: async (args) => {
      const title = asString(args.title);
      const date = asString(args.date);
      if (!title) return "Titre d'événement manquant.";
      if (!ISO_DATE.test(date)) return "Date invalide (format attendu : AAAA-MM-JJ).";

      const patch: { event_date?: string; event_time?: string; note?: string } = {};
      if (typeof args.newDate === "string" && ISO_DATE.test(args.newDate)) patch.event_date = args.newDate;
      if (typeof args.newTime === "string" && /^\d{2}:\d{2}/.test(args.newTime)) patch.event_time = args.newTime;
      if (typeof args.newNote === "string") patch.note = args.newNote;
      if (Object.keys(patch).length === 0) {
        return "Rien à modifier : indique newDate, newTime ou newNote.";
      }

      const { data, error } = await supabase
        .from("events")
        .update(patch)
        .eq("family_id", familyId)
        .eq("event_date", date)
        .ilike("title", title)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) return `Aucun événement « ${title} » le ${date}.`;
      return `Événement « ${title} » mis à jour.`;
    },

    getIdeas: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("content,done")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return JSON.stringify(data);
    },

    addIdea: async (args) => {
      const content = asString(args.content).trim();
      if (!content) return "Contenu de l'idée manquant.";
      const { error } = await supabase
        .from("suggestions")
        .insert({ family_id: familyId, content, created_by: userId });
      if (error) throw error;
      return `Idée ajoutée : « ${content} ».`;
    },

    getMonthlySpending: async (args) => {
      const now = new Date();
      const year = Math.round(asNumber(args.year, now.getFullYear()));
      const month = Math.round(asNumber(args.month, now.getMonth() + 1)); // 1-12

      const current = await fetchMonthlyTotals(supabase, familyId, year, month - 1);
      const previousDate = new Date(year, month - 2, 1);
      const previous = await fetchMonthlyTotals(
        supabase,
        familyId,
        previousDate.getFullYear(),
        previousDate.getMonth(),
      );
      const comparison = compareMonthlySpending(current, previous);

      return JSON.stringify({
        month: `${year}-${String(month).padStart(2, "0")}`,
        total: Number(comparison.total.toFixed(2)),
        byCategory: Object.fromEntries(comparison.categories.map((row) => [row.category, row.amount])),
        previousMonthTotal: Number(comparison.previousTotal.toFixed(2)),
        changePercentVsPreviousMonth:
          comparison.changePercent != null ? Math.round(comparison.changePercent) : null,
        categoriesInSignificantIncrease: significantIncreases(comparison).map((row) => ({
          category: row.category,
          amount: row.amount,
          previousAmount: row.previousAmount,
          changePercent: Math.round(row.changePercent ?? 0),
        })),
      });
    },
  };
}

/** Total + répartition par catégorie pour un mois (`month` 0-indexé). */
async function fetchMonthlyTotals(
  supabase: Db,
  familyId: string,
  year: number,
  month: number,
): Promise<{ total: number; byCategory: CategoryTotal[] }> {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, month + 1, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("receipt_items")
    .select("category,price")
    .eq("family_id", familyId)
    .gte("purchased_at", start)
    .lt("purchased_at", end);
  if (error) throw error;

  return aggregateReceiptItems(data ?? []);
}

/** Prénoms + identifiants des membres de la famille (pour l'IA). */
async function familyProfiles(
  supabase: Db,
  familyId: string,
): Promise<{ id: string; name: string }[]> {
  const { data: members } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId);
  const ids = (members ?? []).map((member) => member.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", ids);
  return (profiles ?? []).map((profile) => ({ id: profile.id, name: profile.display_name }));
}
