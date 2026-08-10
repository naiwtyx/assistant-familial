import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * En-tête de sous-page de réglages : lien retour (« ← Réglages ») + titre +
 * sous-titre optionnel. Cohérent sur toutes les sous-pages (§ navigation).
 */
export function SubPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="motion-in flex flex-col gap-2">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground -ml-1 inline-flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
        {backLabel}
      </Link>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p> : null}
      </div>
    </header>
  );
}

/** Groupe titré de lignes de réglages (une carte, lignes séparées par un filet). */
export function SettingsGroup({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title ? (
        <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
          {title}
        </p>
      ) : null}
      <div className="bg-card shadow-soft divide-border/60 divide-y overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}

type SettingsRowProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Contenu à droite (badge, valeur…) à la place du chevron. */
  trailing?: React.ReactNode;
};

function RowInner({ icon: Icon, title, description, trailing }: SettingsRowProps) {
  return (
    <>
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {description ? <p className="text-muted-foreground truncate text-xs">{description}</p> : null}
      </div>
      {trailing ?? (
        <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );
}

/** Ligne de réglage compacte et cliquable : icône + titre + description → destination. */
export function SettingsRow({ href, ...props }: SettingsRowProps & { href: string }) {
  return (
    <Link
      href={href}
      className="group hover:bg-accent/40 flex items-center gap-3 p-4 transition-colors active:scale-[0.99]"
    >
      <RowInner {...props} />
    </Link>
  );
}

/** Variante bouton (action au clic plutôt qu'une navigation). */
export function SettingsButtonRow({
  onClick,
  ...props
}: SettingsRowProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group hover:bg-accent/40 flex w-full items-center gap-3 p-4 text-left transition-colors active:scale-[0.99]"
    >
      <RowInner {...props} />
    </button>
  );
}
