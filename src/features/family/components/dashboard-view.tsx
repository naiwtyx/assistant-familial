"use client";

import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckSquare,
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

const SHORTCUTS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/courses", label: "Courses", icon: ShoppingCart },
  { href: "/inventaire", label: "Inventaire", icon: Package },
  { href: "/recettes", label: "Recettes", icon: BookOpen },
  { href: "/repas", label: "Repas", icon: CalendarDays },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/idees", label: "Idées", icon: Lightbulb },
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

      <div className="grid grid-cols-2 gap-3">
        {SHORTCUTS.map(({ href, label, icon: Icon }) => (
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

      <FamilyMembersList familyId={family.id} />
      <InviteCard familyId={family.id} />
    </main>
  );
}
