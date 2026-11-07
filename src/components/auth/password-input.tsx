"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  visibilityLabel?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ id, className, disabled, visibilityLabel = "password", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const label = `${visible ? "Hide" : "Show"} ${visibilityLabel}`;

    return (
      <div className="relative">
        <input
          {...props}
          id={id}
          ref={ref}
          disabled={disabled}
          type={visible ? "text" : "password"}
          className={cn(
            "h-11 w-full rounded-lg border border-border bg-surface px-4 pr-12 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60",
            className
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((previous) => !previous)}
          aria-label={label}
          aria-controls={id}
          aria-pressed={visible}
          title={label}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-text-secondary transition-colors hover:text-text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
