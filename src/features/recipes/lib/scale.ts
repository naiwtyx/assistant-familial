/**
 * Met à l'échelle une quantité d'ingrédient selon le nombre de personnes.
 * Ex. recette de base pour 4 personnes -> affichage pour 6 : quantité * 6/4.
 */
export function scaleQuantity(
  baseQuantity: number,
  baseServings: number,
  targetServings: number,
): number {
  if (baseServings <= 0) return baseQuantity;
  return (baseQuantity * targetServings) / baseServings;
}

/** Affiche un nombre proprement (entier si possible, sinon 2 décimales max). */
export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}
