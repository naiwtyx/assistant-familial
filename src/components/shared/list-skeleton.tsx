import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Placeholders animés pendant le chargement. Une variante par type de liste
 * pour que le squelette ressemble vraiment au contenu qui va apparaître —
 * un skeleton générique casse l'illusion.
 */

/** Rows épaisses type "carte" (courses, tâches). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card shadow-soft flex flex-col rounded-2xl p-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className={cn("h-4 rounded-full", index % 2 === 0 ? "w-40" : "w-28")} />
          <div className="ml-auto flex items-center gap-1.5">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-3 rounded" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grille de cartes (recettes, idées). */
export function GridSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Bloc éditorial (agenda, activité) : ligne + méta discrète. */
export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-card shadow-soft flex items-center gap-3 rounded-2xl p-3.5">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn("h-4 rounded-full", index % 2 === 0 ? "w-32" : "w-44")} />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
