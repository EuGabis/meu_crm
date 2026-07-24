"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  className?: string;
}

function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-brand bg-brand" : "border-border bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full transition-transform duration-200",
          checked
            ? "translate-x-4 bg-brand-foreground"
            : "translate-x-0.5 bg-subtle"
        )}
      />
    </button>
  );
}

export { Switch };
