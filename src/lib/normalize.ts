/**
 * Normalise un nom de produit pour le rapprochement (recette ↔ inventaire,
 * courses ↔ inventaire) : minuscules, sans accents, espaces superflus supprimés.
 * Ex. "  Tomates  Cerises " et "tomates cerises" -> "tomates cerises".
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents (marques diacritiques)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
