export type DigestFacts = {
  choresOverdue: string[];
  choresDueToday: string[];
  eventsToday: { title: string; time: string | null }[];
  budget: { total: number; limit: number; overBudget: boolean; nearBudget: boolean } | null;
  expiringSoon: string[];
  expired: string[];
};

/** Vaut false si rien ne justifie d'envoyer une notification aujourd'hui. */
export function hasNotableFacts(facts: DigestFacts): boolean {
  return (
    facts.choresOverdue.length > 0 ||
    facts.choresDueToday.length > 0 ||
    facts.eventsToday.length > 0 ||
    facts.budget != null ||
    facts.expiringSoon.length > 0 ||
    facts.expired.length > 0
  );
}

/** Résumé sans IA — utilisé si Groq est indisponible/échoue, et comme base du prompt IA. */
export function deterministicDigestMessage(facts: DigestFacts): string {
  const parts: string[] = [];
  if (facts.choresOverdue.length > 0) {
    parts.push(
      `${facts.choresOverdue.length} corvée(s) en retard : ${facts.choresOverdue.slice(0, 3).join(", ")}`,
    );
  }
  if (facts.choresDueToday.length > 0) {
    parts.push(`${facts.choresDueToday.length} corvée(s) à faire aujourd'hui`);
  }
  if (facts.eventsToday.length > 0) {
    const list = facts.eventsToday
      .map((event) => (event.time ? `${event.title} à ${event.time.slice(0, 5)}` : event.title))
      .slice(0, 3)
      .join(", ");
    parts.push(`aujourd'hui : ${list}`);
  }
  if (facts.expired.length > 0) {
    parts.push(`${facts.expired.length} produit(s) périmé(s) : ${facts.expired.slice(0, 3).join(", ")}`);
  }
  if (facts.expiringSoon.length > 0) {
    parts.push(
      `${facts.expiringSoon.length} produit(s) périment bientôt : ${facts.expiringSoon.slice(0, 3).join(", ")}`,
    );
  }
  if (facts.budget) {
    parts.push(
      facts.budget.overBudget
        ? `budget du mois dépassé (${Math.round(facts.budget.total)}€ / ${facts.budget.limit}€)`
        : `budget du mois presque atteint (${Math.round(facts.budget.total)}€ / ${facts.budget.limit}€)`,
    );
  }
  return parts.join(" · ") || "Rien à signaler aujourd'hui.";
}
