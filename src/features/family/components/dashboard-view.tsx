"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Camera,
  ChefHat,
  CheckSquare,
  ChevronRight,
  History,
  Lightbulb,
  Package,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Section } from "@/components/shared/section";
import { AskBar } from "@/features/assistant/components/ask-bar";
import { useChores } from "@/features/chores/hooks/use-chores";
import { useEvents } from "@/features/events/hooks/use-events";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import { useMealPlans } from "@/features/meals/hooks/use-meals";
import { toISODate } from "@/features/meals/lib/week";
import { useShoppingList } from "@/features/shopping/hooks/use-shopping-list";
import { deterministicDigestMessage, type DigestFacts } from "@/lib/ai/digest-message";
import { cn } from "@/lib/utils";

import { useActiveFamily } from "./family-provider";

type Shortcut = { href: string; label: string; icon: LucideIcon };
const SHORTCUTS: Shortcut[] = [
  { href: "/recettes", label: "Recettes", icon: BookOpen },
  { href: "/repas", label: "Repas", icon: CalendarDays },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/idees", label: "Idées", icon: Lightbulb },
  { href: "/activite", label: "Activité", icon: History },
];

function greeting(hour: number): string {
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function StatValue({ value, unit }: { value: number | string; unit?: string }) {
  return (
    <p className="font-heading text-[26px] leading-none font-semibold tracking-tight tabular-nums">
      {value}
      {unit ? <span className="text-muted-foreground ml-1 text-sm font-medium">{unit}</span> : null}
    </p>
  );
}

export function DashboardView() {
  const family = useActiveFamily();

  const now = new Date();
  const today = toISODate(now);
  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const salutation = greeting(now.getHours());

  const { data: shopping } = useShoppingList(family.id);
  const { data: inventory } = useInventory(family.id);
  const { data: events } = useEvents(family.id);
  const { data: chores } = useChores(family.id);
  const { data: meals } = useMealPlans(family.id, today);

  const shoppingToBuy = shopping?.filter((item) => !item.is_checked).length ?? 0;
  const inventoryCount = inventory?.length ?? 0;

  const eveningMeal = meals?.find((meal) => meal.date === today && meal.slot === "soir");
  const noonMeal = meals?.find((meal) => meal.date === today && meal.slot === "midi");
  const isEvening = now.getHours() >= 14;
  const nextMeal = isEvening ? eveningMeal : noonMeal;
  const nextMealLabel = isEvening ? "Ce soir" : "Ce midi";

  const eventsToday = useMemo(
    () => events?.filter((event) => event.event_date === today) ?? [],
    [events, today],
  );
  const choresDue = useMemo(
    () =>
      chores?.filter(
        (chore) => !chore.done && chore.due_date != null && chore.due_date <= today,
      ) ?? [],
    [chores, today],
  );
  const choresOverdue = useMemo(
    () => choresDue.filter((chore) => chore.due_date != null && chore.due_date < today),
    [choresDue, today],
  );

  const expiring = useMemo(
    () =>
      (inventory ?? []).filter((item) => {
        const status = getExpiryStatus(item.expiry_date);
        return status === "soon" || status === "expired";
      }),
    [inventory],
  );
  const expiredCount = expiring.filter(
    (item) => getExpiryStatus(item.expiry_date) === "expired",
  ).length;

  // Suggestion IA client-side : réutilise la logique du digest cron mais sans
  // appel réseau. Zéro coût, zéro latence, garantit qu'on affiche toujours
  // quelque chose de pertinent (ou "Rien à signaler aujourd'hui.").
  const suggestion = useMemo<string>(() => {
    const facts: DigestFacts = {
      choresOverdue: choresOverdue.map((chore) => chore.title),
      choresDueToday: choresDue
        .filter((chore) => chore.due_date === today)
        .map((chore) => chore.title),
      eventsToday: eventsToday.map((event) => ({
        title: event.title,
        time: event.event_time,
      })),
      budget: null,
      expiringSoon: expiring
        .filter((item) => getExpiryStatus(item.expiry_date) === "soon")
        .map((item) => item.name),
      expired: expiring
        .filter((item) => getExpiryStatus(item.expiry_date) === "expired")
        .map((item) => item.name),
    };
    return deterministicDigestMessage(facts);
  }, [choresOverdue, choresDue, eventsToday, expiring, today]);

  const suggestionIsIdle = suggestion === "Rien à signaler aujourd'hui.";

  // « Aujourd'hui » n'apparaît que s'il y a un vrai signal à montrer.
  const hasToday =
    Boolean(nextMeal) ||
    eventsToday.length > 0 ||
    choresDue.length > 0 ||
    expiring.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 p-5 pb-8">
      {/* 1. Date + salutation neutre. Focus maison, pas profil : ni prénom, ni email,
          ni nom famille — les infos compte vivent dans Réglages. */}
      <header className="motion-in pt-2">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.1em] uppercase">
          {dateLabel}
        </p>
        <h1 className="font-heading mt-1 text-[26px] leading-tight font-semibold tracking-tight">
          {salutation} <span aria-hidden>👋</span>
        </h1>
      </header>

      {/* 2. Suggestion IA — la première chose "intelligente" que voit l'utilisateur. */}
      <Link
        href="/assistant"
        className="motion-in-delay-1 group bg-ai-gradient shadow-ai relative flex flex-col gap-2 overflow-hidden rounded-3xl p-5 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-4" strokeWidth={2} aria-hidden />
          <span className="text-primary text-[11px] font-semibold tracking-[0.1em] uppercase">
            {suggestionIsIdle ? "Tout est sous contrôle ✨" : "Aperçu du jour"}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-balance">
          {suggestionIsIdle
            ? "Rien d'urgent aujourd'hui. Je reste disponible si tu veux organiser quelque chose."
            : suggestion}
        </p>
        <span className="text-primary mt-1 inline-flex items-center gap-1 text-xs font-medium">
          Ouvrir l&apos;assistant
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* 3. Demander directement -- barre "Ask" comme raccourci vers l'assistant. */}
      <div className="motion-in-delay-2 -mt-3">
        <AskBar />
      </div>

      {/* 4. Aujourd'hui — repas, événements, tâches. Une carte = un signal clair.
          N'affiche QUE des signaux réels : section masquée s'il n'y a rien à
          montrer (pas de carte « Aucun repas prévu » qui occupe l'écran pour rien). */}
      {hasToday ? (
      <Section title="Aujourd'hui" className="motion-in-delay-2">
        <div className="grid gap-3">
          {nextMeal ? (
            <TodayCard
              href="/repas"
              icon={ChefHat}
              label={nextMealLabel}
              value={nextMeal.recipeName ?? "Repas planifié"}
              hint="Repas planifié"
            />
          ) : null}

          {eventsToday.length > 0 ? (
            <TodayCard
              href="/agenda"
              icon={CalendarClock}
              label={eventsToday.length > 1 ? `${eventsToday.length} événements` : "Événement"}
              value={eventsToday[0]!.title}
              hint={
                eventsToday[0]!.event_time
                  ? `à ${eventsToday[0]!.event_time.slice(0, 5)}${eventsToday.length > 1 ? " · voir tout" : ""}`
                  : eventsToday.length > 1
                    ? "voir tout"
                    : "Aujourd'hui"
              }
            />
          ) : null}

          {choresDue.length > 0 ? (
            <TodayCard
              href="/taches"
              icon={CheckSquare}
              label={choresDue.length > 1 ? "Tâches à faire" : "Tâche à faire"}
              value={
                choresDue.length > 1
                  ? `${choresDue.length} tâche${choresDue.length > 1 ? "s" : ""}`
                  : (choresDue[0]?.title ?? "")
              }
              hint={
                choresOverdue.length > 0
                  ? `${choresOverdue.length} en retard`
                  : "Prévues aujourd'hui"
              }
              tone={choresOverdue.length > 0 ? "warn" : "default"}
            />
          ) : null}
        </div>

        {/* Bloc "à surveiller" — signal élevé uniquement si des produits périment. */}
        {expiring.length > 0 ? (
          <Link
            href="/inventaire"
            className={cn(
              "group flex items-center gap-3 rounded-2xl border p-3.5 transition-all active:scale-[0.99]",
              "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10",
              "dark:border-amber-400/25 dark:bg-amber-400/8 dark:hover:bg-amber-400/12",
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {expiring.length} produit{expiring.length > 1 ? "s" : ""} à surveiller
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {expiredCount > 0
                  ? `${expiredCount} périmé${expiredCount > 1 ? "s" : ""} · `
                  : ""}
                {expiring
                  .slice(0, 3)
                  .map((item) => item.name)
                  .join(", ")}
              </p>
            </div>
            <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </Section>
      ) : null}

      {/* 5. La maison en un coup d'œil — état de la maison AVANT les accès
          rapides (hiérarchie produit : ce qui se passe > actions). Contient le
          scanner, action phare qui alimente budget + inventaire. */}
      <Section title="La maison en un coup d'œil" className="motion-in-delay-3">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            href="/courses"
            icon={ShoppingCart}
            value={shoppingToBuy}
            unit={shoppingToBuy > 1 ? "articles" : "article"}
            caption="à acheter"
          />
          <StatTile
            href="/inventaire"
            icon={Package}
            value={inventoryCount}
            unit={inventoryCount > 1 ? "produits" : "produit"}
            caption="en stock"
          />
        </div>

        {/* Scanner de ticket — remonté avec l'état de la maison pour qu'il soit
            immédiatement visible (alimente budget + inventaire). */}
        <Link
          href="/scanner"
          className="group bg-card shadow-soft flex items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.98]"
        >
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Camera className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Scanner un ticket</p>
            <p className="text-muted-foreground text-xs">
              Mets à jour tes dépenses et ton stock en une photo
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Section>

      {/* 6. Accès rapides — actions fréquentes, sous l'état de la maison.
          Courses/Inventaire n'y figurent pas (déjà dans la bottom-nav). */}
      <Section title="Accès rapides" className="motion-in-delay-4">
        <div className="grid grid-cols-3 gap-2">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card shadow-soft flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all active:scale-[0.97]"
            >
              <Icon
                className="text-foreground/80 group-hover:text-primary size-[18px] transition-colors"
                strokeWidth={1.75}
              />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </Section>
    </main>
  );
}

type TodayCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  muted?: boolean;
  tone?: "default" | "warn";
};

function TodayCard({ href, icon: Icon, label, value, hint, muted, tone = "default" }: TodayCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-card shadow-soft flex items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.99]",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          tone === "warn"
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-[15px] font-medium",
            muted && "text-muted-foreground font-normal",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</p>
      </div>
      <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatTile({
  href,
  icon: Icon,
  value,
  unit,
  caption,
}: {
  href: string;
  icon: LucideIcon;
  value: number;
  unit?: string;
  caption: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card shadow-soft flex flex-col gap-3 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <Icon className="text-muted-foreground size-[18px]" strokeWidth={1.75} />
        <ChevronRight className="text-muted-foreground/60 size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      <StatValue value={value} unit={unit} />
      <p className="text-muted-foreground text-xs">{caption}</p>
    </Link>
  );
}
