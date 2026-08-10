"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";

import { NotificationSettings } from "./notification-settings";

/**
 * Page Notifications : activation des notifications push sur cet appareil.
 * (Un seul canal aujourd'hui — pas de sous-types inventés.)
 */
export function NotificationsView() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Notifications"
        subtitle="Reçois les alertes importantes sur cet appareil"
      />

      <div className="motion-in bg-card shadow-soft rounded-2xl p-4">
        <NotificationSettings />
      </div>

      <p className="text-muted-foreground px-1 text-xs leading-relaxed">
        Une fois activées, tu reçois les rappels de courses, le digest quotidien et les événements
        du jour. Tu peux désactiver à tout moment.
      </p>
    </main>
  );
}
