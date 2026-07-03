/** Utilitaires de semaine (lundi → dimanche), en date locale (pas UTC). */

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Lundi de la semaine contenant `date`, à minuit local. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = dimanche … 6 = samedi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  return result;
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Les 7 jours d'une semaine à partir de son lundi (ISO). */
export function weekDays(weekStartISO: string): { iso: string; label: string; dayNum: number }[] {
  const start = new Date(`${weekStartISO}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { iso: toISODate(date), label: DAY_LABELS[index] ?? "", dayNum: date.getDate() };
  });
}

/** Libellé « 3 – 9 mars » d'une semaine. */
export function weekRangeLabel(weekStartISO: string): string {
  const start = new Date(`${weekStartISO}T00:00:00`);
  const end = addDays(start, 6);
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("fr-FR", withMonth ? { day: "numeric", month: "long" } : { day: "numeric" });
  const sameMonth = start.getMonth() === end.getMonth();
  return `${fmt(start, !sameMonth)} – ${fmt(end, true)}`;
}
