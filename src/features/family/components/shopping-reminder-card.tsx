"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { getErrorMessage } from "@/lib/get-error-message";

import { useActiveFamily } from "./family-provider";
import { useSetFamilyShoppingDay } from "../hooks/use-family";

// Convention JS getDay : 0 = dimanche … 6 = samedi.
const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

/** Réglage du jour de rappel automatique des courses (réservé aux parents). */
export function ShoppingReminderCard({ familyId }: { familyId: string }) {
  const family = useActiveFamily();
  const setDay = useSetFamilyShoppingDay(familyId);

  function handleChange(value: string) {
    const day = value === "" ? null : Number.parseInt(value, 10);
    setDay.mutate(day, {
      onSuccess: () =>
        toast.success(
          day == null
            ? "Rappel des courses désactivé"
            : `Rappel programmé le ${DAYS.find((d) => d.value === day)?.label.toLowerCase()}`,
        ),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="text-primary size-4" />
          Rappel des courses
        </CardTitle>
        <CardDescription>
          Un rappel « complétez la liste » est envoyé à toute la famille ce jour-là.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NativeSelect
          defaultValue={family.shopping_reminder_day ?? ""}
          onChange={(event) => handleChange(event.target.value)}
          aria-label="Jour de rappel des courses"
        >
          <option value="">Aucun rappel</option>
          {DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </NativeSelect>
      </CardContent>
    </Card>
  );
}
