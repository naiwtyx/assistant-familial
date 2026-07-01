import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select natif stylé. Sur mobile, il ouvre le sélecteur natif iOS/Android,
 * ce qui offre une bien meilleure ergonomie tactile qu'un menu personnalisé.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "border-input h-9 w-full appearance-none rounded-lg border bg-transparent px-2.5 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
    </div>
  );
}

export { NativeSelect };
