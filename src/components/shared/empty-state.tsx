import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * État vide "premium" : icône dans un cercle en accent doux, titre, description
 * discrète, et optionnellement un CTA. Remplace les "Aucun X pour l'instant"
 * plats — un écran vide est aussi un moment d'expérience.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "motion-in flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-primary/8 text-primary flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="font-heading text-[15px] font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground text-sm leading-relaxed text-balance">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
