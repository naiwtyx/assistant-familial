/**
 * Normalise un nom de produit pour le rapprochement recette ↔ inventaire :
 * minuscules, sans accents, espaces superflus supprimés.
 * Ex. "  Tomates  Cerises " et "tomates cerises" -> "tomates cerises".
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    // Supprime les accents (plage Unicode des marques diacritiques combinantes).
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
