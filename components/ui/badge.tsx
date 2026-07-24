import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        outline: "border-input bg-surface text-muted-foreground",
        won: "border-transparent bg-status-won-surface text-status-won",
        lost: "border-transparent bg-status-lost-surface text-status-lost",
        open: "border-transparent bg-status-open-surface text-status-open",
        progress:
          "border-transparent bg-status-progress-surface text-status-progress",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
