import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "glow";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
        (variant === "default" || variant === "glow") &&
          "bg-accent text-on-primary hover:bg-accent-hover",
        variant === "destructive" &&
          "bg-error text-on-primary hover:bg-error/85",
        variant === "outline" &&
          "border border-border bg-transparent text-text-primary hover:border-outline-variant hover:bg-surface-hover",
        variant === "secondary" &&
          "border border-border-subtle bg-surface-container text-text-primary hover:bg-surface-hover",
        variant === "ghost" &&
          "text-text-secondary hover:bg-surface-container hover:text-text-primary",
        variant === "link" &&
          "bg-transparent text-accent underline-offset-4 hover:underline",
        size === "default" && "min-h-11 px-4 py-2.5",
        size === "sm" && "min-h-9 px-3 py-2 text-xs",
        size === "lg" && "min-h-12 px-7 py-3",
        size === "icon" && "h-11 w-11",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
export { Button };
