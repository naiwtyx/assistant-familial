"use client";

import { ArrowBigUp, Check, Lightbulb, Pencil, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

import {
  useAddSuggestion,
  useDeleteSuggestion,
  useSetSuggestionDone,
  useSuggestions,
  useToggleSuggestionVote,
  useUpdateSuggestion,
} from "../hooks/use-ideas";

export function IdeasView() {
  const { family, role, userId } = useMyMembership();
  const canModerate = isAuthorized(role);

  const { data: ideas, isLoading, isError } = useSuggestions(family.id);
  const addSuggestion = useAddSuggestion(family.id);
  const setDone = useSetSuggestionDone(family.id);
  const removeSuggestion = useDeleteSuggestion(family.id);
  const toggleVote = useToggleSuggestionVote(family.id);
  const updateSuggestion = useUpdateSuggestion(family.id);

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    updateSuggestion.mutate(
      { id, content: trimmed },
      {
        onError,
        onSuccess: () => setEditingId(null),
      },
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    addSuggestion.mutate(trimmed, { onError });
    setContent("");
  }

  const openIdeas = ideas?.filter((idea) => !idea.done) ?? [];
  const topIdea = openIdeas.length > 0 ? openIdeas.reduce((a, b) => (a.voteCount >= b.voteCount ? a : b)) : null;
  const suggestion = (() => {
    if (openIdeas.length === 0) return null;
    if (topIdea && topIdea.voteCount >= 2) {
      return `« ${topIdea.content} » fait l'unanimité (${topIdea.voteCount} votes). Prêt à passer à l'action ?`;
    }
    if (openIdeas.length >= 5) {
      return `${openIdeas.length} idées en attente — vote pour tes préférées pour aider à trancher.`;
    }
    return null;
  })();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Boîte à idées" subtitle="Propose des améliorations pour la famille" />

      <PageSuggestion text={suggestion} />

      <form onSubmit={submit} className="motion-in-delay-1 bg-card shadow-soft flex items-center gap-2 rounded-2xl p-2 pl-3">
        <Input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ton idée…"
          maxLength={500}
          className="h-9 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" disabled={!content.trim()} aria-label="Proposer">
          <Send className="size-4" strokeWidth={1.75} />
        </Button>
      </form>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les idées.</p>
      ) : ideas && ideas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Aucune idée pour l'instant"
          description="Propose une amélioration, un projet ou une envie. La famille votera pour ses préférées."
        />
      ) : (
        <ul className="motion-in-delay-2 bg-card shadow-soft flex flex-col rounded-2xl p-2">
          {ideas?.map((idea) => (
            <li
              key={idea.id}
              className={cn(
                "group/row flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/40",
                idea.done && "opacity-60",
              )}
            >
              {canModerate ? (
                <Checkbox
                  checked={idea.done}
                  onCheckedChange={(checked) => {
                    haptic(checked === true ? "success" : "light");
                    setDone.mutate({ id: idea.id, done: checked === true }, { onError });
                  }}
                  aria-label="Marquer comme réalisée"
                  className="mt-1 size-5 transition-transform active:scale-90"
                />
              ) : idea.done ? (
                <Check className="mt-1 size-4 text-emerald-600" strokeWidth={2} />
              ) : (
                <span className="mt-1 size-5" />
              )}

              {editingId === idea.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <Input
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    maxLength={500}
                    aria-label="Modifier l'idée"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={!editValue.trim() || updateSuggestion.isPending}
                    onClick={() => saveEdit(idea.id)}
                    aria-label="Enregistrer"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-7 shrink-0"
                    onClick={() => setEditingId(null)}
                    aria-label="Annuler"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[15px] break-words", idea.done && "line-through")}>
                      {idea.content}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {idea.authorName ?? "Quelqu'un"}
                    </p>
                  </div>

                  <Button
                    variant={idea.hasVoted ? "default" : "outline"}
                    size="sm"
                    className="h-auto shrink-0 flex-col gap-0 px-2 py-1.5 transition-transform active:scale-95"
                    disabled={toggleVote.isPending}
                    onClick={() => {
                      haptic("medium");
                      toggleVote.mutate({ id: idea.id, hasVoted: idea.hasVoted }, { onError });
                    }}
                    aria-label={idea.hasVoted ? "Retirer mon vote" : "Voter pour cette idée"}
                  >
                    <ArrowBigUp className="size-4" strokeWidth={1.75} />
                    <span className="text-xs tabular-nums">{idea.voteCount}</span>
                  </Button>

                  {canModerate || idea.created_by === userId ? (
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-8"
                        onClick={() => {
                          setEditingId(idea.id);
                          setEditValue(idea.content);
                        }}
                        aria-label="Modifier l'idée"
                      >
                        <Pencil className="size-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        onClick={() => {
                          haptic("warning");
                          removeSuggestion.mutate(idea.id, { onError });
                        }}
                        aria-label="Supprimer l'idée"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
