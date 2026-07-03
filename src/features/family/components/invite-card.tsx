"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Hourglass, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useMyMembership } from "./family-provider";
import { familyKeys } from "../hooks/use-family";
import { isAuthorized } from "../lib/roles";

type CreateInviteResult = { code?: string; approved?: boolean; error?: string };

export function InviteCard({ familyId }: { familyId: string }) {
  const { role } = useMyMembership();
  const canGenerate = isAuthorized(role);
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/invites/create", { method: "POST" });
      const data = (await response.json()) as CreateInviteResult;
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Impossible de créer l'invitation.");
      }
      if (data.approved) {
        setCode(data.code ?? null);
        setPending(false);
        setCopied(false);
      } else {
        setCode(null);
        setPending(true);
        toast.success("Demande envoyée à un parent pour approbation.");
      }
      // Un parent verra la nouvelle demande en attente immédiatement.
      void queryClient.invalidateQueries({ queryKey: familyKeys.pendingInvites(familyId) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le code");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inviter un membre</CardTitle>
        <CardDescription>
          {canGenerate
            ? "Génère un code valable 7 jours et partage-le."
            : "Demande un code d'invitation ; un parent devra l'approuver."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {code ? (
          <div className="flex items-center gap-2">
            <output className="bg-muted flex-1 rounded-lg border px-3 py-2 text-center font-mono text-lg tracking-widest">
              {code}
            </output>
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copier le code">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        ) : null}

        {pending ? (
          <p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Hourglass className="size-4 shrink-0" />
            En attente de l&apos;approbation d&apos;un parent.
          </p>
        ) : null}

        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          variant={code ? "outline" : "default"}
        >
          {canGenerate ? <UserPlus className="size-4" /> : <Hourglass className="size-4" />}
          {isLoading
            ? canGenerate
              ? "Génération…"
              : "Envoi…"
            : canGenerate
              ? code
                ? "Générer un nouveau code"
                : "Générer un code"
              : "Demander un code"}
        </Button>
      </CardContent>
    </Card>
  );
}
