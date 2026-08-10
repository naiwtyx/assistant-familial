"use client";

import { useEffect } from "react";

import { track } from "./track";

const SESSION_KEY = "af-app-open-tracked";

/**
 * Journalise une ouverture d'app (`app_open`) une fois par session de
 * navigation. C'est la base des mesures de rétention (retour à J1/J7/J30),
 * dérivées ensuite des horodatages. Monté dans le layout famille.
 */
export function AnalyticsTracker({ familyId }: { familyId: string }) {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage indisponible : on trace quand même l'ouverture.
    }
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    track("app_open", { familyId, standalone });
  }, [familyId]);

  return null;
}
