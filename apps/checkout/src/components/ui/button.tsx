"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border-2 border-primary bg-white hover:border-primary/50 hover:bg-primary/5 shadow-sm hover:shadow-md active:scale-[0.98]",
        secondary:
          "bg-slate-100 text-slate-900 shadow-md shadow-slate-200/20 hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-10 rounded-lg px-4 py-2.5 text-sm",
        lg: "h-14 rounded-xl px-10 py-4 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
            />
            <span>
              {typeof children === "string" ? "Processing..." : children}
            </span>
          </motion.span>
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.span>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
