"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useRecipes } from "@/features/recipes/hooks/use-recipes";
import { getErrorMessage } from "@/lib/get-error-message";

import {
  useAddPlannedToShopping,
  useClearMeal,
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

  const { data: meals } = useMealPlans(family.id, weekStart);
  const { data: recipes } = useRecipes(family.id);
  const setMeal = useSetMealRecipe(family.id);
  const clearMeal = useClearMeal(family.id);
  const addToShopping = useAddPlannedToShopping(family.id);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  // Recherche rapide d'un repas par créneau.
  const mealByKey = new Map((meals ?? []).map((meal) => [`${meal.date}:${meal.slot}`, meal]));

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
      onSuccess: (count) => toast.success(`${count} ingrédient(s) ajouté(s) aux courses`),
      onError,
    });
  }

  const hasRecipes = (recipes?.length ?? 0) > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <CalendarDays className="text-primary size-5" />
          Repas de la semaine
        </h1>
        <p className="text-muted-foreground text-sm">Planifiez, puis remplissez les courses.</p>
      </header>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftWeek(-1)} aria-label="Semaine précédente">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">{weekRangeLabel(weekStart)}</span>
        <Button variant="outline" size="icon" onClick={() => shiftWeek(1)} aria-label="Semaine suivante">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {!hasRecipes ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
          Crée d&apos;abord des <Link href="/recettes" className="text-primary underline">recettes</Link>{" "}
          pour pouvoir planifier tes repas.
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {days.map((day) => (
          <div
            key={day.iso}
            className={`rounded-xl border p-3 ${day.iso === TODAY_ISO ? "border-primary/50" : ""}`}
          >
            <p className="text-sm font-medium capitalize">
              {day.label} {day.dayNum}
              {day.iso === TODAY_ISO ? (
                <span className="text-primary ml-1 text-xs font-normal">· aujourd&apos;hui</span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {SLOTS.map(({ slot, label }) => {
                const meal = mealByKey.get(`${day.iso}:${slot}`);
                return (
                  <div key={slot} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-9 shrink-0 text-xs">{label}</span>
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
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleAddToShopping} disabled={addToShopping.isPending}>
        <ShoppingCart className="size-4" />
        Ajouter les ingrédients aux courses
      </Button>
    </main>
  );
}
