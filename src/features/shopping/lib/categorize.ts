import { PRODUCT_CATEGORIES, type ProductCategory } from "@/config/constants";

/**
 * Devine le rayon d'un article à partir de son nom (mots-clés FR).
 * Retourne une catégorie produit connue, ou `null` si indéterminé (→ « Autre »).
 */
const KEYWORDS: { category: ProductCategory; words: string[] }[] = [
  {
    category: "fruits_vegetables",
    words: [
      "pomme", "banane", "tomate", "salade", "carotte", "oignon", "patate", "pomme de terre",
      "courgette", "poivron", "citron", "orange", "fraise", "légume", "legume", "fruit", "ail",
      "champignon", "concombre", "épinard", "epinard", "brocoli", "avocat", "raisin", "melon",
      "poireau", "haricot", "clémentine", "clementine", "kiwi", "ananas", "mangue", "cerise",
    ],
  },
  {
    category: "dairy",
    words: [
      "lait", "yaourt", "yogourt", "fromage", "beurre", "crème", "creme", "œuf", "oeuf",
      "emmental", "gruyère", "gruyere", "mozzarella", "camembert", "petit suisse", "fromage blanc",
    ],
  },
  {
    category: "meat_fish",
    words: [
      "poulet", "boeuf", "bœuf", "porc", "jambon", "saucisse", "steak", "poisson", "saumon",
      "thon", "viande", "dinde", "lardon", "escalope", "merguez", "cabillaud", "crevette",
    ],
  },
  {
    category: "bakery",
    words: ["pain", "baguette", "croissant", "brioche", "viennoiserie", "pain de mie"],
  },
  {
    category: "frozen",
    words: ["surgelé", "surgele", "congelé", "congele", "glace", "sorbet", "pizza surgelée"],
  },
  {
    category: "drinks",
    words: [
      "eau", "jus", "soda", "coca", "vin", "bière", "biere", "café", "cafe", "thé", "the",
      "boisson", "sirop", "limonade", "cidre",
    ],
  },
  {
    category: "grocery",
    words: [
      "pâtes", "pates", "riz", "farine", "sucre", "sel", "huile", "sauce", "conserve", "café",
      "céréale", "cereale", "biscuit", "chocolat", "confiture", "miel", "vinaigre", "moutarde",
      "ketchup", "mayonnaise", "semoule", "lentille", "pois chiche", "compote", "chips", "gâteau",
      "gateau", "bonbon",
    ],
  },
  {
    category: "hygiene",
    words: [
      "savon", "shampoing", "shampooing", "dentifrice", "gel douche", "papier toilette",
      "mouchoir", "coton", "déodorant", "deodorant", "rasoir", "brosse à dent",
    ],
  },
  {
    category: "household",
    words: [
      "éponge", "eponge", "lessive", "liquide vaisselle", "sac poubelle", "essuie-tout",
      "essuie tout", "nettoyant", "javel", "papier absorbant", "film alimentaire", "aluminium",
    ],
  },
];

export function categorizeItem(name: string): ProductCategory | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  for (const { category, words } of KEYWORDS) {
    if (words.some((word) => normalized.includes(word))) return category;
  }
  return null;
}

/** Ordre d'affichage des rayons (les articles « Autre » en dernier). */
export const CATEGORY_ORDER: string[] = PRODUCT_CATEGORIES.map((category) => category.value);

/** Index de tri d'une catégorie (inconnue/`null` = « Autre », en dernier). */
export function categoryRank(category: string | null): number {
  const value = category ?? "other";
  const index = CATEGORY_ORDER.indexOf(value);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

/** Regroupe des articles par rayon, dans l'ordre d'affichage des rayons. */
export function groupByRayon<T extends { category: string | null }>(
  items: T[],
): { key: string; items: T[] }[] {
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category ?? "other";
    const group = byKey.get(key) ?? [];
    group.push(item);
    byKey.set(key, group);
  }
  return [...byKey.entries()]
    .map(([key, groupItems]) => ({ key, items: groupItems }))
    .sort((a, b) => categoryRank(a.key) - categoryRank(b.key));
}
