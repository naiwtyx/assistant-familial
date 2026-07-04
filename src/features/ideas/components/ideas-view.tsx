"use client";

import { ArrowBigUp, Check, Lightbulb, Pencil, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Lightbulb className="text-primary size-5" />
          Boîte à idées
        </h1>
        <p className="text-muted-foreground text-sm">
          Propose des améliorations pour l&apos;app familiale.
        </p>
      </header>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ton idée…"
          maxLength={500}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!content.trim()} aria-label="Proposer">
          <Send className="size-4" />
        </Button>
      </form>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les idées.</p>
      ) : ideas && ideas.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-sm">
          Aucune idée pour l&apos;instant. Lance-toi !
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {ideas?.map((idea) => (
            <li
              key={idea.id}
              className={cn("flex items-start gap-2 rounded-xl border p-3", idea.done && "opacity-60")}
            >
              {canModerate ? (
                <Checkbox
                  checked={idea.done}
                  onCheckedChange={(checked) =>
                    setDone.mutate({ id: idea.id, done: checked === true }, { onError })
                  }
                  aria-label="Marquer comme réalisée"
                  className="mt-0.5"
                />
              ) : idea.done ? (
                <Check className="mt-0.5 size-4 text-emerald-600" />
              ) : (
                <span className="mt-0.5 size-4" />
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
                    <p className={cn("text-sm break-words", idea.done && "line-through")}>
                      {idea.content}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {idea.authorName ?? "Quelqu'un"}
                    </p>
                  </div>

                  <Button
                    variant={idea.hasVoted ? "default" : "outline"}
                    size="sm"
                    className="h-auto shrink-0 flex-col gap-0 px-2 py-1"
                    disabled={toggleVote.isPending}
                    onClick={() =>
                      toggleVote.mutate({ id: idea.id, hasVoted: idea.hasVoted }, { onError })
                    }
                    aria-label={idea.hasVoted ? "Retirer mon vote" : "Voter pour cette idée"}
                  >
                    <ArrowBigUp className="size-4" />
                    <span className="text-xs tabular-nums">{idea.voteCount}</span>
                  </Button>

                  {canModerate || idea.created_by === userId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                      onClick={() => {
                        setEditingId(idea.id);
                        setEditValue(idea.content);
                      }}
                      aria-label="Modifier l'idée"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}

                  {canModerate || idea.created_by === userId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                      onClick={() => removeSuggestion.mutate(idea.id, { onError })}
                      aria-label="Supprimer l'idée"
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
