"use client";

import {
  Home,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon };
const LEFT_TABS: Tab[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/courses", label: "Courses", icon: ShoppingCart },
];
const RIGHT_TABS: Tab[] = [
  { href: "/inventaire", label: "Inventaire", icon: Package },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/reglages") {
    return pathname.startsWith("/reglages") || pathname.startsWith("/parents");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barre de navigation fixe en bas. Un bouton central proéminent pour l'IA
 * — pattern Instagram/apps modernes — pour que l'assistant reste à portée
 * de pouce depuis n'importe quel écran.
 */
export function BottomNav() {
  const pathname = usePathname();
  const assistantActive = pathname === "/assistant" || pathname.startsWith("/assistant/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
        {LEFT_TABS.map((tab) => (
          <NavItem key={tab.href} tab={tab} active={isTabActive(pathname, tab.href)} />
        ))}

        {/* Hub IA central proéminent -- élevé au-dessus de la barre, ombre chromée. */}
        <Link
          href="/assistant"
          aria-label="Assistant IA"
          className={cn(
            "-mt-6 mx-1 flex size-14 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95",
            "bg-primary text-primary-foreground shadow-ai",
            assistantActive && "ring-4 ring-primary/25",
          )}
        >
          <Sparkles className="size-6" />
        </Link>

        {RIGHT_TABS.map((tab) => (
          <NavItem key={tab.href} tab={tab} active={isTabActive(pathname, tab.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const { href, label, icon: Icon } = tab;
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {/* Indicateur d'onglet actif : petite pill en haut, façon Apple. */}
      <span
        aria-hidden
        className={cn(
          "bg-primary absolute -top-px h-[3px] w-8 rounded-full transition-all",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className={cn("size-5 transition-transform", active && "scale-105")} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
