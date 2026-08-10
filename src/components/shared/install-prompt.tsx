"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "af-install-dismissed";

/** iPhone/iPad en Safari (hors app installée) : cible du guide d'installation. */
function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // iPadOS récent se présente comme un Mac tactile.
  const isIpadDesktop =
    /macintosh/i.test(ua) && "ontouchend" in window && window.navigator.maxTouchPoints > 1;
  if (!isIos && !isIpadDesktop) return false;
  // Exclut les navigateurs in-app (Chrome iOS « CriOS », etc.) où le partage
  // n'ouvre pas « Sur l'écran d'accueil ».
  return !/crios|fxios|edgios|opios/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Guide discret d'ajout à l'écran d'accueil sur iPhone (iOS ne propose aucun
 * bouton d'installation natif). N'apparaît que sur Safari iOS, hors app déjà
 * installée, et jamais après avoir été fermé une fois. Apparaît après un court
 * délai pour ne pas gêner le premier affichage.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isIosSafari()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // localStorage indisponible : on montre quand même le guide.
    }
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div className="motion-in fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-md px-4">
      <div className="bg-card shadow-elevated border-border/60 relative flex flex-col gap-2 rounded-2xl border p-4">
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground/60 hover:text-foreground absolute top-3 right-3 transition-colors"
          aria-label="Fermer"
        >
          <X className="size-4" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <SquarePlus className="size-[18px]" strokeWidth={1.75} />
          </div>
          <p className="pr-6 text-[15px] font-medium">Installe l&apos;app sur ton iPhone</p>
        </div>

        <p className="text-muted-foreground text-[13px] leading-relaxed">
          Pour l&apos;ouvrir en plein écran comme une vraie app : appuie sur{" "}
          <Share className="mb-0.5 inline size-3.5" strokeWidth={2} /> <strong>Partager</strong> en
          bas de Safari, puis choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
        </p>
      </div>
    </div>
  );
}
