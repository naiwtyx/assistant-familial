/**
 * Constantes métier partagées (UI + schémas Zod + futur assistant IA).
 *
 * Volontairement stockées en `text` côté base (pas en enum Postgres) pour rester
 * facilement extensibles. Ces listes restent la source de vérité côté application.
 */

export const STORAGE_LOCATIONS = [
  { value: "fridge", label: "Frigo" },
  { value: "freezer", label: "Congélateur" },
  { value: "pantry", label: "Placard" },
  { value: "cellar", label: "Cave" },
  { value: "other", label: "Autre" },
] as const;

export const PRODUCT_CATEGORIES = [
  { value: "fruits_vegetables", label: "Fruits & Légumes" },
  { value: "dairy", label: "Produits laitiers" },
  { value: "meat_fish", label: "Viande & Poisson" },
  { value: "grocery", label: "Épicerie" },
  { value: "frozen", label: "Surgelés" },
  { value: "drinks", label: "Boissons" },
  { value: "bakery", label: "Boulangerie" },
  { value: "hygiene", label: "Hygiène" },
  { value: "household", label: "Maison" },
  { value: "other", label: "Autre" },
] as const;

export const UNITS = [
  { value: "piece", label: "pièce(s)" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "pack", label: "paquet(s)" },
] as const;

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]["value"];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];
export type Unit = (typeof UNITS)[number]["value"];

export const STORAGE_LOCATION_VALUES = STORAGE_LOCATIONS.map((l) => l.value) as [
  StorageLocation,
  ...StorageLocation[],
];
export const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map((c) => c.value) as [
  ProductCategory,
  ...ProductCategory[],
];
export const UNIT_VALUES = UNITS.map((u) => u.value) as [Unit, ...Unit[]];

const STORAGE_LOCATION_LABELS = new Map(STORAGE_LOCATIONS.map((l) => [l.value, l.label]));
const PRODUCT_CATEGORY_LABELS = new Map(PRODUCT_CATEGORIES.map((c) => [c.value, c.label]));
const UNIT_LABELS = new Map(UNITS.map((u) => [u.value, u.label]));

/** Libellé lisible d'un emplacement/catégorie/unité (repli sur la valeur brute si inconnue). */
export function locationLabel(value: string | null): string {
  return value ? (STORAGE_LOCATION_LABELS.get(value as StorageLocation) ?? value) : "—";
}
export function categoryLabel(value: string | null): string {
  return value ? (PRODUCT_CATEGORY_LABELS.get(value as ProductCategory) ?? value) : "—";
}
export function unitLabel(value: string | null): string {
  return value ? (UNIT_LABELS.get(value as Unit) ?? value) : "";
}
