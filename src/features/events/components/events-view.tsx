"use client";

import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import type { FamilyEvent } from "@/types/db";

import { useAddEvent, useDeleteEvent, useEvents } from "../hooks/use-events";

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

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    addEvent.mutate(
      { title: title.trim(), date, time: time || null, note: note.trim() || null },
      {
        onError,
        onSuccess: () => {
          setTitle("");
          setDate("");
          setTime("");
          setNote("");
        },
      },
    );
  }

  const groups = events ? groupByDate(events) : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <CalendarClock className="text-primary size-5" />
          Agenda
        </h1>
        <p className="text-muted-foreground text-sm">Les rendez-vous et activités de la famille.</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border p-3">
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
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;agenda.</p>
      ) : groups.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-sm">
          Aucun événement à venir.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                {formatDateHeading(group.date)}
              </p>
              <ul className="flex flex-col gap-2">
                {group.events.map((event) => (
                  <li key={event.id} className="flex items-start gap-2 rounded-xl border p-3">
                    {event.event_time ? (
                      <span className="text-primary shrink-0 text-sm font-medium tabular-nums">
                        {event.event_time.slice(0, 5)}
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm break-words">{event.title}</p>
                      {event.note ? (
                        <p className="text-muted-foreground text-xs break-words">{event.note}</p>
                      ) : null}
                    </div>
                    {canModerate || event.created_by === userId ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                        onClick={() => removeEvent.mutate(event.id, { onError })}
                        aria-label="Supprimer l'événement"
                      >
                        <Trash2 className="size-4" />
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
