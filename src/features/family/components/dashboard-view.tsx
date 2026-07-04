"use client";

import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  History,
  Lightbulb,
  Package,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";

import { useMyMembership } from "./family-provider";
import { FamilyMembersList } from "./family-members-list";
import { InviteCard } from "./invite-card";

type Shortcut = { href: string; label: string; icon: LucideIcon };
const SECTIONS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Maison",
    items: [
      { href: "/courses", label: "Courses", icon: ShoppingCart },
      { href: "/inventaire", label: "Inventaire", icon: Package },
      { href: "/recettes", label: "Recettes", icon: BookOpen },
      { href: "/repas", label: "Repas", icon: CalendarDays },
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/taches", label: "Tâches", icon: CheckSquare },
      { href: "/agenda", label: "Agenda", icon: CalendarClock },
      { href: "/idees", label: "Idées", icon: Lightbulb },
      { href: "/activite", label: "Activité", icon: History },
    ],
  },
  {
    title: "Assistant IA",
    items: [{ href: "/assistant", label: "Assistant", icon: Sparkles }],
  },
];

export function DashboardView() {
  const { family, email } = useMyMembership();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">Famille</p>
          <h1 className="truncate text-xl font-bold tracking-tight">{family.name}</h1>
          {email ? <p className="text-muted-foreground truncate text-xs">{email}</p> : null}
        </div>
        <SignOutButton />
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="bg-card hover:bg-muted/50 flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors"
              >
                <Icon className="text-primary size-6" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <FamilyMembersList familyId={family.id} />
      <InviteCard familyId={family.id} />
    </main>
  );
}
