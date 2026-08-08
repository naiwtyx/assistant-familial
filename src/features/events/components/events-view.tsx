"use client";

import { CalendarClock, ChevronDown, Plus, Repeat, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { FeedSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { FamilyEvent } from "@/types/db";

import { useAddEvent, useDeleteEvent, useEvents } from "../hooks/use-events";
import type { EventRecurrence } from "../services/events.service";

const TODAY = new Date().toISOString().slice(0, 10);

function formatDateHeading(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function groupByDate(events: FamilyEvent[]): { date: string; events: FamilyEvent[] }[] {
  const groups: { date: string; events: FamilyEvent[] }[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.date === event.event_date) last.events.push(event);
    else groups.push({ date: event.event_date, events: [event] });
  }
  return groups;
}

export function EventsView() {
  const { family, role, userId } = useMyMembership();
  const canModerate = isAuthorized(role);

  const { data: events, isLoading, isError } = useEvents(family.id);
  const addEvent = useAddEvent(family.id);
  const removeEvent = useDeleteEvent(family.id);

  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [recurrence, setRecurrence] = useState<"" | EventRecurrence>("");
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Focus le titre dès qu'on déplie -> saisie sans un tap de plus.
  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => titleRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function reset() {
    setTitle("");
    setDate("");
    setTime("");
    setNote("");
    setRecurrence("");
    setShowDetails(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    addEvent.mutate(
      {
        title: title.trim(),
        date,
        time: time || null,
        note: note.trim() || null,
        recurrence: recurrence || null,
      },
      {
        onError,
        onSuccess: () => {
          haptic("success");
          reset();
          setIsOpen(false);
        },
      },
    );
  }

  const groups = events ? groupByDate(events) : [];

  const suggestion = (() => {
    if (!events || events.length === 0) return null;
    const todayIso = new Date().toISOString().slice(0, 10);
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const weekEnd = in7Days.toISOString().slice(0, 10);
    const nextWeek = events.filter((event) => event.event_date <= weekEnd);
    if (nextWeek.length === 0) return "Aucun événement cette semaine — la maison est libre.";
    if (nextWeek.length >= 5) return `${nextWeek.length} événements cette semaine — semaine bien remplie.`;
    const nextEvent = events.find((event) => event.event_date >= todayIso);
    if (nextEvent && nextEvent.event_date === todayIso) {
      return `« ${nextEvent.title} » ${nextEvent.event_time ? `à ${nextEvent.event_time.slice(0, 5)}` : "aujourd'hui"}.`;
    }
    return null;
  })();

  const canSubmit = title.trim().length > 0 && date !== "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Agenda" subtitle="Les rendez-vous et activités de la famille" />

      <PageSuggestion text={suggestion} />

      {/* Form collapsible : replié = un simple bouton "+ Ajouter" ; déplié =
          form action-first avec labels clairs. Cache le clutter à l'état
          consultation et donne toute la place à la saisie quand on crée. */}
      <div
        className={cn(
          "motion-in-delay-1 overflow-hidden rounded-2xl transition-all",
          isOpen ? "bg-card shadow-soft" : "",
        )}
      >
        {isOpen ? (
          <form onSubmit={submit} className="flex flex-col gap-4 p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-heading text-sm font-semibold">Nouvel événement</p>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Annuler
              </button>
            </div>

            <div className="grid gap-1.5">
              <Label
                htmlFor="ev-title"
                className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
              >
                Titre
              </Label>
              <Input
                id="ev-title"
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sortie au parc, rendez-vous…"
                maxLength={120}
                className="h-11 text-[15px] scroll-mt-24 scroll-mb-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="ev-date"
                  className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
                >
                  Date
                </Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={date}
                  min={TODAY}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 text-[15px] scroll-mt-24 scroll-mb-32"
                />
              </div>
              <div className="grid gap-1.5">
                <Label
                  htmlFor="ev-time"
                  className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
                >
                  Heure · optionnel
                </Label>
                <Input
                  id="ev-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-11 text-[15px] tabular-nums scroll-mt-24 scroll-mb-32"
                />
              </div>
            </div>

            {/* Détails cachés par défaut : sur mobile un form plus court =
                un form entier au-dessus du clavier. On déplie à la demande. */}
            {showDetails ? (
              <div className="bg-muted/40 flex flex-col gap-3 rounded-xl p-3">
                <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                  Détails
                </p>
                <div className="grid gap-1.5">
                  <Label htmlFor="ev-rec" className="text-muted-foreground text-[11px] font-medium">
                    Répétition
                  </Label>
                  <NativeSelect
                    id="ev-rec"
                    value={recurrence}
                    onChange={(event) => setRecurrence(event.target.value as "" | EventRecurrence)}
                    className="h-10"
                  >
                    <option value="">Ne pas répéter</option>
                    <option value="weekly">Chaque semaine</option>
                    <option value="monthly">Chaque mois</option>
                  </NativeSelect>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ev-note" className="text-muted-foreground text-[11px] font-medium">
                    Note · optionnel
                  </Label>
                  <Input
                    id="ev-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex. Prévoir un pique-nique"
                    maxLength={300}
                    className="h-10 scroll-mt-24 scroll-mb-32"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-muted-foreground hover:text-foreground -mt-1 flex items-center gap-1.5 self-start text-xs transition-colors"
              >
                <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                Plus d&apos;options
              </button>
            )}

            <Button
              type="submit"
              disabled={!canSubmit || addEvent.isPending}
              className="h-11 w-full rounded-xl text-[15px] transition-transform active:scale-[0.98]"
            >
              {addEvent.isPending ? "Ajout…" : "Ajouter l'événement"}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-card shadow-soft group flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
          >
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Plus className="size-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Nouvel événement</p>
              <p className="text-muted-foreground text-xs">Rendez-vous, activité, sortie…</p>
            </div>
            <ChevronDown
              className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-y-0.5"
              strokeWidth={1.75}
            />
          </button>
        )}
      </div>

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;agenda.</p>
      ) : groups.length === 0 && !isOpen ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucun événement à venir"
          description="Ajoute un rendez-vous, une sortie ou une activité pour que toute la famille soit au courant."
          action={
            <Button onClick={() => setIsOpen(true)} className="rounded-xl">
              <Plus className="size-4" strokeWidth={2} />
              Ajouter un événement
            </Button>
          }
        />
      ) : groups.length === 0 ? null : (
        <div className="motion-in-delay-2 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
                {formatDateHeading(group.date)}
              </p>
              <ul className="bg-card shadow-soft flex flex-col rounded-2xl p-2">
                {group.events.map((event) => (
                  <li key={event.id} className="group/row flex items-start gap-3 rounded-xl px-2 py-2.5">
                    {event.event_time ? (
                      <span className="text-primary bg-primary/10 shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold tabular-nums">
                        {event.event_time.slice(0, 5)}
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[15px] break-words">
                        {event.title}
                        {event.recurrence ? (
                          <Repeat className="text-muted-foreground size-3 shrink-0" strokeWidth={1.75} />
                        ) : null}
                      </p>
                      {event.note ? (
                        <p className="text-muted-foreground mt-0.5 text-xs break-words">{event.note}</p>
                      ) : null}
                    </div>
                    {canModerate || event.created_by === userId ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8 shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                        onClick={() => {
                          haptic("warning");
                          removeEvent.mutate(event.id, { onError });
                        }}
                        aria-label="Supprimer l'événement"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
