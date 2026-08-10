"use client";

import { CalendarDays, ChefHat, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { FeedSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useRecipes } from "@/features/recipes/hooks/use-recipes";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

import {
  useAddPlannedToShopping,
  useClearMeal,
  useCookMeal,
  useMealPlans,
  useSetMealRecipe,
} from "../hooks/use-meals";
import type { MealSlot } from "../services/meals.service";
import { addDays, startOfWeek, toISODate, weekDays, weekRangeLabel } from "../lib/week";

const SLOTS: { slot: MealSlot; label: string }[] = [
  { slot: "midi", label: "Midi" },
  { slot: "soir", label: "Soir" },
];

const TODAY_ISO = toISODate(new Date());

export function MealsView() {
  const family = useActiveFamily();
  const [weekStart, setWeekStart] = useState(() => toISODate(startOfWeek(new Date())));

  const { data: meals, isError: mealsError } = useMealPlans(family.id, weekStart);
  const { data: recipes, isLoading: recipesLoading, isError: recipesError } = useRecipes(family.id);
  const setMeal = useSetMealRecipe(family.id);
  const clearMeal = useClearMeal(family.id);
  const addToShopping = useAddPlannedToShopping(family.id);
  const cook = useCookMeal(family.id);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const mealByKey = useMemo(
    () => new Map((meals ?? []).map((meal) => [`${meal.date}:${meal.slot}`, meal])),
    [meals],
  );

  const plannedCount = useMemo(
    () => (meals ?? []).filter((meal) => meal.recipe_id != null).length,
    [meals],
  );
  const totalSlots = days.length * SLOTS.length;

  // Prochain créneau non planifié à partir d'aujourd'hui (insight actionnable).
  const nextGap = useMemo(() => {
    for (const day of days) {
      if (day.iso < TODAY_ISO) continue;
      for (const { slot, label } of SLOTS) {
        const meal = mealByKey.get(`${day.iso}:${slot}`);
        if (!meal?.recipe_id) {
          const dayLabel = day.iso === TODAY_ISO ? "aujourd'hui" : `${day.label} ${day.dayNum}`;
          return `${dayLabel} ${label.toLowerCase()}`;
        }
      }
    }
    return null;
  }, [days, mealByKey]);

  const suggestion = (() => {
    if ((recipes?.length ?? 0) === 0) return null;
    if (plannedCount === 0) {
      return "Aucun repas planifié cette semaine — demande à l'assistant d'organiser ta semaine.";
    }
    if (plannedCount === totalSlots) {
      return "Semaine complètement planifiée. Ajoute les ingrédients manquants aux courses en un tap.";
    }
    // Créneau précis à combler : plus actionnable qu'un simple compte.
    if (nextGap) {
      return `Ton repas de ${nextGap} n'est pas encore planifié.`;
    }
    return null;
  })();

  function shiftWeek(offset: number) {
    setWeekStart(toISODate(addDays(new Date(`${weekStart}T00:00:00`), offset * 7)));
  }

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function handleSlotChange(date: string, slot: MealSlot, recipeId: string) {
    if (recipeId === "") {
      clearMeal.mutate({ date, slot }, { onError });
    } else {
      haptic("light");
      setMeal.mutate({ date, slot, recipeId }, { onError });
    }
  }

  function handleAddToShopping() {
    const recipeIds = (meals ?? [])
      .map((meal) => meal.recipe_id)
      .filter((id): id is string => id != null);
    if (recipeIds.length === 0) {
      toast.error("Aucune recette planifiée cette semaine.");
      return;
    }
    addToShopping.mutate(recipeIds, {
      onSuccess: (count) =>
        toast.success(
          count === 0
            ? "Tu as déjà tout en stock ✅"
            : `${count} ingrédient(s) manquant(s) ajouté(s) aux courses`,
        ),
      onError,
    });
  }

  function handleCook(recipeId: string) {
    haptic("success");
    cook.mutate(recipeId, {
      onSuccess: (count) =>
        toast.success(
          count === 0
            ? "Aucun produit correspondant dans l'inventaire."
            : `${count} produit(s) déduit(s) de l'inventaire`,
        ),
      onError,
    });
  }

  const hasRecipes = (recipes?.length ?? 0) > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Repas de la semaine" subtitle="Planifiez, puis remplissez les courses" />

      <PageSuggestion text={suggestion} />

      {/* Sélecteur de semaine premium : pill navigation Apple-style. */}
      <div className="motion-in-delay-1 bg-card shadow-soft flex items-center justify-between gap-2 rounded-2xl p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => shiftWeek(-1)}
          aria-label="Semaine précédente"
          className="rounded-full"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </Button>
        <span className="text-sm font-medium capitalize">{weekRangeLabel(weekStart)}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => shiftWeek(1)}
          aria-label="Semaine suivante"
          className="rounded-full"
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </Button>
      </div>

      {recipesError || mealsError ? (
        <p className="text-destructive py-4 text-center text-sm">
          Impossible de charger les repas. Réessaie dans un instant.
        </p>
      ) : recipesLoading ? (
        <FeedSkeleton />
      ) : !hasRecipes ? (
        <EmptyState
          icon={CalendarDays}
          title="Crée d'abord des recettes"
          description="Sans recettes, impossible de planifier tes repas. Ajoutes-en quelques-unes pour commencer."
          action={
            <Link
              href="/recettes"
              className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
            >
              Créer une recette
            </Link>
          }
        />
      ) : (
        <div className="motion-in-delay-2 flex flex-col gap-2.5">
          {days.map((day) => {
            const isToday = day.iso === TODAY_ISO;
            return (
              <div
                key={day.iso}
                className={cn(
                  "bg-card shadow-soft rounded-2xl p-4 transition-shadow",
                  isToday && "ring-primary/40 ring-1",
                )}
              >
                <div className="mb-2.5 flex items-baseline justify-between">
                  <p className="text-[15px] font-medium capitalize">
                    {day.label}{" "}
                    <span className="text-muted-foreground text-sm font-normal">{day.dayNum}</span>
                  </p>
                  {isToday ? (
                    <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase">
                      Aujourd&apos;hui
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {SLOTS.map(({ slot, label }) => {
                    const meal = mealByKey.get(`${day.iso}:${slot}`);
                    return (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-10 shrink-0 text-[11px] font-semibold tracking-[0.08em] uppercase">
                          {label}
                        </span>
                        <NativeSelect
                          value={meal?.recipe_id ?? ""}
                          disabled={!hasRecipes}
                          onChange={(event) => handleSlotChange(day.iso, slot, event.target.value)}
                          aria-label={`${label} du ${day.label} ${day.dayNum}`}
                          className="flex-1"
                        >
                          <option value="">—</option>
                          {recipes?.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </NativeSelect>
                        {meal?.recipe_id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary shrink-0"
                            disabled={cook.isPending}
                            onClick={() => handleCook(meal.recipe_id as string)}
                            aria-label="J'ai cuisiné ce repas (déduire de l'inventaire)"
                            title="J'ai cuisiné : déduire de l'inventaire"
                          >
                            <ChefHat className="size-4" strokeWidth={1.75} />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasRecipes ? (
        <Button
          onClick={handleAddToShopping}
          disabled={addToShopping.isPending}
          className="motion-in-delay-3 h-11 rounded-xl transition-transform active:scale-[0.98]"
        >
          <ShoppingCart className="size-4" strokeWidth={1.75} />
          Ajouter les ingrédients aux courses
        </Button>
      ) : null}
    </main>
  );
}
