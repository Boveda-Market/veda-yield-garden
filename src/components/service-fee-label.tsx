import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Tap-friendly "Servicio BÓVEDA" label with an explanation popover (works on mobile). */
export function ServiceFeeLabel({ t }: { t: (s: string) => string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-left text-muted-foreground underline decoration-dotted underline-offset-2">
          {t("Servicio BÓVEDA")} ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs leading-5">
        {t("Cubre los servicios avanzados de BÓVEDA: simulación de seguridad antes de firmar, mejor ruta, protección contra deslizamiento y automatización de la bóveda.")}
      </PopoverContent>
    </Popover>
  );
}
