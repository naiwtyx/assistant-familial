import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * En-tête de page uniforme : titre pleine largeur, sous-titre discret, actions
 * à droite. Assure une hiérarchie visuelle cohérente sur toutes les pages
 * (courses, tâches, agenda, inventaire, recettes...).
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("motion-in flex items-start justify-between gap-3 pt-2", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="font-heading truncate text-[22px] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-0.5 truncate text-[13px]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
