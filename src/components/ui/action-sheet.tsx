import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackToClose } from "@/lib/back-close";

/**
 * Action sheet (Robinhood / Cash App style): on phones it slides up from the bottom with a grab
 * handle and can be swiped down to close; on larger screens it stays a centered card.
 * Use inside the regular `Dialog` root from `@/components/ui/dialog`.
 */
export const ActionSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { closeLabel?: string; locked?: boolean }
>(({ className, children, closeLabel = "Cerrar", locked = false, style, onOpenAutoFocus, onEscapeKeyDown, onPointerDownOutside, onInteractOutside, ...props }, ref) => {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const start = React.useRef<number | null>(null);
  const [drag, setDrag] = React.useState(0);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onUp = () => { const d = drag; start.current = null; setDrag(0); if (d > 90) closeRef.current?.click(); };
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      style={drag ? { ...style, transform: `translateY(${drag}px)`, transition: "none" } : { ...style, transition: "transform 200ms ease-out" }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[92dvh] w-full max-w-lg grid-cols-[minmax(0,1fr)] gap-3 overflow-x-hidden overflow-y-auto sm:gap-4 overscroll-contain rounded-t-3xl border border-b-0 bg-background px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl",
        "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border-b sm:p-6",
        "sm:duration-200 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
        className,
      )}
      // Never focus a field on open: the phone keyboard would cover the quote and confirm button.
      onOpenAutoFocus={(e) => { e.preventDefault(); onOpenAutoFocus?.(e); }}
      onEscapeKeyDown={(e) => { if (locked) e.preventDefault(); onEscapeKeyDown?.(e); }}
      onPointerDownOutside={(e) => { if (locked) e.preventDefault(); onPointerDownOutside?.(e); }}
      onInteractOutside={(e) => { if (locked) e.preventDefault(); onInteractOutside?.(e); }}
      {...props}
    >
      <div data-sheet-handle aria-hidden onPointerDown={locked ? undefined : onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="-mx-5 -mt-2 flex h-7 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden">
        <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
      {!locked && <BackToClose closeRef={closeRef} />}
      {!locked && <DialogPrimitive.Close ref={closeRef} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-border bg-muted text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:right-4 sm:top-4">
        <X className="size-[18px]" />
        <span className="sr-only">{closeLabel}</span>
      </DialogPrimitive.Close>}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
});
ActionSheetContent.displayName = "ActionSheetContent";
