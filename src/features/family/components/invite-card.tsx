"use client";

import { Check, Copy, UserPlus } from "lucide-react";
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
import { getErrorMessage } from "@/lib/get-error-message";

import { useCreateInvite } from "../hooks/use-family";

export function InviteCard({ familyId }: { familyId: string }) {
  const createInvite = useCreateInvite(familyId);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    createInvite.mutate(undefined, {
      onSuccess: (invite) => {
        setCode(invite.code);
        setCopied(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
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
        <CardDescription>Génère un code valable 7 jours et partage-le.</CardDescription>
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
        <Button onClick={handleGenerate} disabled={createInvite.isPending} variant={code ? "outline" : "default"}>
          <UserPlus className="size-4" />
          {createInvite.isPending ? "Génération…" : code ? "Générer un nouveau code" : "Générer un code"}
        </Button>
      </CardContent>
    </Card>
  );
}
