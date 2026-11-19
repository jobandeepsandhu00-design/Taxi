"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { haptic } from "@/lib/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-ring/35 active:scale-[0.96] motion-reduce:active:scale-100 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_6px_24px_-8px_rgba(255,196,0,0.55)] hover:bg-[#ffd23f] hover:shadow-[0_8px_32px_-6px_rgba(255,196,0,0.65)]",
        navy: "bg-foreground text-background hover:opacity-90",
        destructive: "bg-destructive text-white hover:brightness-110",
        success: "bg-success text-white hover:brightness-110",
        outline: "glass text-foreground hover:border-primary/40 hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary/20",
        ghost: "text-foreground/80 hover:bg-accent hover:text-foreground",
        link: "text-link underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, onPointerDown, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
        haptic();
        onPointerDown?.(e);
      }}
      {...props}
    />
  );
}

export { Button, buttonVariants };
