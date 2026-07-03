/**
 * Alias ergonomiques vers les types de tables, pour éviter de répéter
 * `Database["public"]["Tables"][...]["Row"]` dans toute l'application.
 */
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Family = Tables["families"]["Row"];
export type FamilyMember = Tables["family_members"]["Row"];
export type FamilyInvite = Tables["family_invites"]["Row"];
export type ShoppingItem = Tables["shopping_items"]["Row"];
export type InventoryItem = Tables["inventory_items"]["Row"];
export type Recipe = Tables["recipes"]["Row"];
export type RecipeIngredient = Tables["recipe_ingredients"]["Row"];
export type ActivityLog = Tables["activity_log"]["Row"];
export type Chore = Tables["chores"]["Row"];
export type MealPlan = Tables["meal_plans"]["Row"];
export type SuggestionVote = Tables["suggestion_votes"]["Row"];
export type FamilyEvent = Tables["events"]["Row"];
