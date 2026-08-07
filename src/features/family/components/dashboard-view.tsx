"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarDays,
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

import { AskBar } from "@/features/assistant/components/ask-bar";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useChores } from "@/features/chores/hooks/use-chores";
import { useEvents } from "@/features/events/hooks/use-events";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { useMealPlans } from "@/features/meals/hooks/use-meals";
import { toISODate } from "@/features/meals/lib/week";
import { useShoppingList } from "@/features/shopping/hooks/use-shopping-list";
import { cn } from "@/lib/utils";

import { useMyMembership } from "./family-provider";
import { FamilyMembersList } from "./family-members-list";
import { InviteCard } from "./invite-card";

type Shortcut = { href: string; label: string; icon: LucideIcon };
const SHORTCUTS: Shortcut[] = [
  { href: "/courses", label: "Courses", icon: ShoppingCart },
  { href: "/inventaire", label: "Inventaire", icon: Package },
  { href: "/recettes", label: "Recettes", icon: BookOpen },
  { href: "/repas", label: "Repas", icon: CalendarDays },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/idees", label: "Idées", icon: Lightbulb },
  { href: "/activite", label: "Activité", icon: History },
];

function firstName(displayName: string | null): string {
  if (!displayName) return "";
  return displayName.trim().split(/\s+/)[0] ?? "";
}

function greeting(hour: number): string {
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

/** Placeholder pour un bloc de valeur sur les cartes stat. */
function StatValue({ value, unit }: { value: number | string; unit?: string }) {
  return (
    <p className="font-heading text-2xl leading-none font-semibold tracking-tight tabular-nums">
      {value}
      {unit ? <span className="text-muted-foreground ml-1 text-base font-medium">{unit}</span> : null}
    </p>
  );
}

export function DashboardView() {
  const { family, displayName, email } = useMyMembership();

  const now = new Date();
  const today = toISODate(now);
  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const salutation = greeting(now.getHours());
  const name = firstName(displayName);

  // Toutes les requêtes utilisent React Query + realtime : elles se mettent
  // à jour toutes seules quand la famille modifie quoi que ce soit.
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

  const eventsToday = events?.filter((event) => event.event_date === today) ?? [];
  const choresToday =
    chores?.filter(
      (chore) => !chore.done && chore.due_date != null && chore.due_date <= today,
    ) ?? [];

  const expiring = (inventory ?? []).filter((item) => {
    const status = getExpiryStatus(item.expiry_date);
    return status === "soon" || status === "expired";
  });
  const expiredCount = expiring.filter((item) => getExpiryStatus(item.expiry_date) === "expired").length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-5 pb-8">
      {/* En-tête personnel : nomme l'utilisateur, situe la journée. Plus intime qu'un titre "Tableau de bord". */}
      <header className="motion-in flex items-start justify-between gap-4 pt-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {dateLabel}
          </p>
          <h1 className="font-heading mt-0.5 truncate text-2xl leading-tight font-semibold tracking-tight">
            {salutation}
            {name ? `, ${name}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {family.name}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
        <SignOutButton />
      </header>

      {/* Barre "Demandez…" en hero : positionne l'IA comme cœur de l'app, pas comme un onglet parmi d'autres. */}
      <div className="motion-in-delay-1">
        <AskBar />
      </div>

      {/* Section Aujourd'hui : ce qui compte MAINTENANT. Une carte = un signal clair. */}
      <section className="motion-in-delay-2 flex flex-col gap-3">
        <SectionTitle>Aujourd&apos;hui</SectionTitle>

        <div className="grid gap-3">
          <TodayCard
            href="/repas"
            icon={ChefHat}
            label={nextMealLabel}
            value={nextMeal?.recipeName ?? "Aucun repas prévu"}
            hint={nextMeal ? "Repas planifié" : "Planifie-le en un clic"}
            muted={!nextMeal}
          />

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

          {choresToday.length > 0 ? (
            <TodayCard
              href="/taches"
              icon={CheckSquare}
              label={choresToday.length > 1 ? "Tâches à faire" : "Tâche à faire"}
              value={
                choresToday.length > 1
                  ? `${choresToday.length} tâches`
                  : (choresToday[0]?.title ?? "")
              }
              hint={
                choresToday.some(
                  (chore) => chore.due_date != null && chore.due_date < today,
                )
                  ? "Certaines sont en retard"
                  : "Prévues aujourd'hui"
              }
              tone={
                choresToday.some(
                  (chore) => chore.due_date != null && chore.due_date < today,
                )
                  ? "warn"
                  : "default"
              }
            />
          ) : null}
        </div>

        {/* Bloc "Attention" séparé quand des produits périment : signal élevé sans polluer la section principale. */}
        {expiring.length > 0 ? (
          <Link
            href="/inventaire"
            className={cn(
              "group flex items-center gap-3 rounded-2xl border p-3.5 transition-all",
              "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10",
              "dark:border-amber-400/25 dark:bg-amber-400/10 dark:hover:bg-amber-400/15",
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4.5" />
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

        {/* Deux stat tiles compactes : chiffres qui rassurent, pas de graphe surchargé. */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/courses"
            className="group bg-card shadow-soft flex flex-col gap-2 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <ShoppingCart className="text-muted-foreground size-4" />
              <ChevronRight className="text-muted-foreground/60 size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <StatValue value={shoppingToBuy} unit={shoppingToBuy > 1 ? "articles" : "article"} />
            <p className="text-muted-foreground text-xs">à acheter</p>
          </Link>
          <Link
            href="/inventaire"
            className="group bg-card shadow-soft flex flex-col gap-2 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <Package className="text-muted-foreground size-4" />
              <ChevronRight className="text-muted-foreground/60 size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
            <StatValue value={inventoryCount} unit={inventoryCount > 1 ? "produits" : "produit"} />
            <p className="text-muted-foreground text-xs">en stock</p>
          </Link>
        </div>
      </section>

      {/* Raccourcis compacts : accès rapide sans écraser la page. */}
      <section className="motion-in-delay-3 flex flex-col gap-3">
        <SectionTitle>Tout</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card hover:bg-accent/60 flex flex-col items-center gap-1.5 rounded-2xl p-3 shadow-soft transition-all active:scale-[0.97]"
            >
              <Icon className="text-foreground/80 group-hover:text-primary size-5 transition-colors" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Assistant en accès direct : deuxième signal, en cas où la barre du haut a été négligée. */}
      <Link
        href="/assistant"
        className="motion-in-delay-4 group bg-ai-gradient shadow-ai flex items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-elevated active:scale-[0.98]"
      >
        <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Assistant IA</p>
          <p className="text-muted-foreground text-xs">
            Planifie, ajoute, réorganise en langage naturel
          </p>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <section className="motion-in-delay-4 flex flex-col gap-3">
        <FamilyMembersList familyId={family.id} />
        <InviteCard familyId={family.id} />
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </h2>
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
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-sm font-medium",
            muted && "text-muted-foreground font-normal",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground truncate text-xs">{hint}</p>
      </div>
      <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
