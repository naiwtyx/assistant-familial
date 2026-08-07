"use client";

import { CalendarClock, Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { FeedSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
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

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [recurrence, setRecurrence] = useState<"" | EventRecurrence>("");

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
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
          setTitle("");
          setDate("");
          setTime("");
          setNote("");
          setRecurrence("");
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Agenda" subtitle="Les rendez-vous et activités de la famille" />

      <PageSuggestion text={suggestion} />

      <form onSubmit={submit} className="motion-in-delay-1 bg-card shadow-soft flex flex-col gap-2.5 rounded-2xl p-3.5">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Rendez-vous, activité…"
          maxLength={120}
          aria-label="Titre de l'événement"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            min={TODAY}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Date"
            className="flex-1"
          />
          <Input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Heure (optionnelle)"
            className="w-28"
          />
        </div>
        <NativeSelect
          value={recurrence}
          onChange={(event) => setRecurrence(event.target.value as "" | EventRecurrence)}
          aria-label="Répétition"
        >
          <option value="">Ne pas répéter</option>
          <option value="weekly">Chaque semaine</option>
          <option value="monthly">Chaque mois</option>
        </NativeSelect>
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optionnelle)"
            maxLength={300}
            aria-label="Note"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!title.trim() || !date} aria-label="Ajouter">
            <Plus className="size-4" />
          </Button>
        </div>
      </form>

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;agenda.</p>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucun événement à venir"
          description="Ajoute un rendez-vous, une sortie ou une activité pour que toute la famille soit au courant."
        />
      ) : (
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
