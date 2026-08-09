/**
 * Analyse déterministe des commandes les plus fréquentes, SANS appeler l'IA
 * (économie de tokens Groq). On ne court-circuite l'IA que sur des motifs
 * clairs ; tout le reste retombe sur le LLM. Filet de sécurité : ces intents
 * produisent des ACTIONS PROPOSÉES — rien ne s'exécute sans confirmation, donc
 * une analyse imparfaite ne peut pas corrompre de données.
 */

export type QuickIntent =
  | { kind: "add_shopping"; items: { name: string; quantity: number; unit: string | null }[] }
  | { kind: "plan_week" }
  | null;

const SHOPPING_RE =
  /^(?:ajoute[rs]?|rajoute[rs]?|mets?)\s+(.+?)\s+(?:aux? courses?|(?:a|à) (?:la|ma) liste|dans (?:la|les|ma) (?:liste|courses)|sur (?:la|ma) liste)\b/i;

/** Retire les articles français en tête (« du lait » -> « lait »). */
function stripArticles(value: string): string {
  return value
    .trim()
    .replace(/^(?:du |de la |de l['’ ]|des |de |d['’]|le |la |les |l['’ ]|un |une )+/i, "")
    .trim();
}

export function parseQuickIntent(text: string): QuickIntent {
  const raw = text.trim();
  if (raw.length === 0) return null;
  const lower = raw.toLowerCase();

  // « Organise / planifie ma semaine »
  if (/(organis|planifi|rempli|prepar)/i.test(lower) && /semaine/i.test(lower)) {
    return { kind: "plan_week" };
  }

  // « Ajoute X (et Y) aux courses / à la liste »
  const match = raw.match(SHOPPING_RE);
  if (match?.[1]) {
    const items = match[1]
      .split(/\s*(?:,| et | plus |&|\+)\s*/i)
      .map((part) => stripArticles(part))
      .filter((part) => part.length > 0 && part.length <= 60);
    if (items.length > 0 && items.length <= 12) {
      return {
        kind: "add_shopping",
        items: items.map((name) => ({ name, quantity: 1, unit: null })),
      };
    }
  }

  return null;
}
