"use client";

import { ArrowLeft, ArrowRight, Brain, CalendarDays, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { cn } from "@/lib/utils";

import { CreateFamilyForm } from "./create-family-form";
import { JoinFamilyForm } from "./join-family-form";

const VALUE_POINTS = [
  {
    icon: CalendarDays,
    title: "Toute la maison au même endroit",
    text: "Courses, repas, tâches et agenda, partagés en famille.",
  },
  {
    icon: Wand2,
    title: "Un assistant qui agit",
    text: "« Ajoute du lait », « organise ma semaine » — il s'en occupe.",
  },
  {
    icon: Brain,
    title: "Il apprend vos habitudes",
    text: "Plus vous l'utilisez, plus ses suggestions deviennent justes.",
  },
];

/**
 * Onboarding : vend la valeur avant de demander quoi que ce soit (vision § 8).
 * Court — un écran qui donne envie, puis la création/rejointe du foyer.
 */
export function OnboardingView() {
  const [step, setStep] = useState<"welcome" | "setup">("welcome");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col p-6">
      {step === "welcome" ? (
        <div className="motion-in flex flex-1 flex-col justify-center gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary text-primary-foreground shadow-ai flex size-16 items-center justify-center rounded-3xl">
              <Sparkles className="size-8" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-tight">
                Votre assistant familial
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm text-balance">
                Organisez la maison en langage naturel. L&apos;assistant s&apos;occupe du reste.
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {VALUE_POINTS.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className={cn(
                  "bg-card shadow-soft flex items-start gap-3 rounded-2xl p-4",
                  `motion-in-delay-${index + 1}`,
                )}
              >
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[15px] font-medium">{title}</p>
                  <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="motion-in-delay-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="bg-primary text-primary-foreground flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-medium transition-transform active:scale-[0.98]"
            >
              Commencer
              <ArrowRight className="size-4" strokeWidth={2} />
            </button>
            <div className="flex justify-center">
              <SignOutButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="motion-in flex flex-1 flex-col gap-6 pt-2">
          <button
            type="button"
            onClick={() => setStep("welcome")}
            className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1 self-start text-sm"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Retour
          </button>

          <div>
            <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">
              Créez votre foyer
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vous en serez le propriétaire et pourrez inviter les autres membres.
            </p>
          </div>

          <div className="bg-card shadow-soft rounded-2xl p-4">
            <CreateFamilyForm />
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">ou rejoindre un foyer existant</span>
            <span className="bg-border h-px flex-1" />
          </div>

          <div className="bg-card shadow-soft rounded-2xl p-4">
            <JoinFamilyForm />
          </div>
        </div>
      )}
    </main>
  );
}
