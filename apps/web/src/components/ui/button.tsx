import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border border-cyan-200/20 bg-gradient-to-r from-cyan-200 via-sky-300 to-emerald-300 text-slate-950 shadow-[0_18px_40px_-22px_rgba(56,189,248,0.85)] hover:brightness-105 hover:shadow-[0_20px_42px_-20px_rgba(45,212,191,0.82)] disabled:border-cyan-100/10 disabled:bg-gradient-to-r disabled:from-cyan-200/65 disabled:via-sky-300/65 disabled:to-emerald-300/65 disabled:text-slate-950/70 disabled:shadow-none disabled:opacity-70",
  ghost:
    "border border-white/10 bg-white/5 text-slate-100 backdrop-blur-md hover:bg-white/10 disabled:border-white/5 disabled:bg-white/0 disabled:text-slate-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background,color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed active:translate-y-px",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
