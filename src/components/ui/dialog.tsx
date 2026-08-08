"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-150 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Sur mobile, ancre la modale en HAUT plutôt qu'au centre. C'est ce qui
 * garantit qu'un input reste visible quand le clavier iOS s'ouvre :
 * même sans redimensionnement du viewport (iOS Safari < 15.4), le haut
 * de la fenêtre reste au-dessus du clavier. Sur ≥sm on repasse au
 * centrage classique (le clavier n'est plus un problème sur desktop).
 *
 * Combinée à `viewport.interactiveWidget = "resizes-content"` (voir
 * `app/layout.tsx`), l'expérience clavier iOS 15.4+ est native :
 * la fenêtre se resize, `100dvh` s'ajuste, tout reste utilisable.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  // Belt-and-suspenders : sur iOS < 15.4 où le viewport ne se resize pas,
  // on force le scroll vers l'input focused à l'intérieur du dialog.
  React.useEffect(() => {
    const node = contentRef.current
    if (!node) return
    function handleFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null
      if (!target || !node!.contains(target)) return
      if (target.matches("input, textarea, select, [contenteditable='true']")) {
        // Laisse le clavier apparaître avant de scroller (~300 ms sur iOS).
        window.setTimeout(() => {
          target.scrollIntoView({ block: "center", behavior: "smooth" })
        }, 300)
      }
    }
    node.addEventListener("focusin", handleFocusIn)
    return () => node.removeEventListener("focusin", handleFocusIn)
  }, [])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          // Mobile : ancré en haut, plein largeur (avec marge), max height
          // = dynamic viewport height (respecte le clavier iOS 15.4+),
          // scrollable si le contenu déborde.
          "fixed z-50 outline-none duration-150",
          "left-1/2 top-[max(env(safe-area-inset-top),1rem)] -translate-x-1/2 w-[calc(100%-1.5rem)]",
          "max-h-[calc(100dvh-max(env(safe-area-inset-top),1rem)-max(env(safe-area-inset-bottom),1rem))]",
          "overflow-y-auto overscroll-contain",
          "rounded-3xl bg-popover p-5 pt-6 text-popover-foreground shadow-elevated ring-1 ring-foreground/10",
          "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2",
          // Desktop : centré, plus étroit, taille modérée.
          "sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:max-h-[85vh] sm:p-6 sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95 sm:data-open:slide-in-from-top-0 sm:data-closed:slide-out-to-top-0",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 rounded-full"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Footer : sticky en bas du dialog scrollable pour que les boutons
        // (Annuler / Valider) restent toujours accessibles même clavier ouvert.
        "sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t bg-popover/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Annuler
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-tight font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
