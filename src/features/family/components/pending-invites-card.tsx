"use client";

import { Check, Hourglass } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";

import { useApproveInvite, usePendingInvites } from "../hooks/use-family";

/** Demandes d'invitation créées par des membres, en attente d'approbation (parents). */
export function PendingInvitesCard({ familyId }: { familyId: string }) {
  const { data: invites, isLoading } = usePendingInvites(familyId);
  const approve = useApproveInvite(familyId);

  if (isLoading || !invites || invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hourglass className="text-primary size-4" />
          Invitations à approuver
        </CardTitle>
        <CardDescription>Un membre a demandé à inviter quelqu&apos;un.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {invite.authorName ?? "Un membre"}
                </p>
                <p className="text-muted-foreground font-mono text-xs tracking-widest">
                  {invite.code}
                </p>
              </div>
              <Button
                size="sm"
                disabled={approve.isPending}
                onClick={() =>
                  approve.mutate(invite.id, {
                    onSuccess: () => toast.success("Invitation approuvée."),
                    onError: (error) => toast.error(getErrorMessage(error)),
                  })
                }
              >
                <Check className="size-4" />
                Approuver
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
