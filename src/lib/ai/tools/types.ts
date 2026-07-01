import type { z } from "zod";

/**
 * Architecture PRÉPARÉE pour l'assistant IA (non implémenté).
 *
 * Principe : l'IA n'appelle jamais directement la base. Elle utilise des "tools"
 * qui réutilisent EXACTEMENT la couche `features/<domaine>/services`. Chaque tool
 * est décrit par un schéma Zod (paramètres) qui sert à la fois à la validation et
 * à la description du tool pour le modèle.
 *
 * Exemple d'outils visés : getInventory, getShoppingList, addShoppingItem,
 * removeShoppingItem, createRecipe, getRecipes, updateInventory.
 *
 * Aucune logique ici : uniquement le CONTRAT, pour pouvoir brancher l'IA
 * plus tard sans refactoriser l'application.
 */
export interface AiTool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  /** Identifiant unique exposé au modèle (ex. "addShoppingItem"). */
  name: string;
  /** Description en langage naturel, lue par le modèle. */
  description: string;
  /** Schéma des paramètres (validation + génération du schéma JSON pour l'IA). */
  parameters: TInput;
  /** Exécution réelle : délègue à la couche services du domaine concerné. */
  execute(input: z.infer<TInput>, context: AiToolContext): Promise<TOutput>;
}

/**
 * Contexte injecté à l'exécution d'un tool (qui agit, pour quelle famille).
 * Garantit que l'IA reste cloisonnée aux données de la famille de l'utilisateur.
 */
export interface AiToolContext {
  userId: string;
  familyId: string;
}
