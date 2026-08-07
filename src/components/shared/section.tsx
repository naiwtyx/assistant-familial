import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Section standard : titre en caps espacé (idiome iOS/Notion), optionnellement
 * une action à droite, et un gap uniforme entre le titre et le contenu.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3 px-1">
          {title ? (
            <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
