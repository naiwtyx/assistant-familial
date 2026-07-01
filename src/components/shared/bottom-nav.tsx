"use client";

import { BookOpen, LayoutDashboard, Package, Settings, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: ShoppingCart },
  { href: "/inventaire", label: "Inventaire", icon: Package },
  { href: "/recettes", label: "Recettes", icon: BookOpen },
  { href: "/reglages", label: "Réglages", icon: Settings },
] as const;

/** Barre de navigation fixe en bas, façon application mobile (gère la zone sûre iOS). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          // L'espace parents (/parents) est rattaché à l'onglet Réglages.
          const isActive =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/reglages" && pathname.startsWith("/parents"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
