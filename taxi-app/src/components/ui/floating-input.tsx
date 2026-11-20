import * as React from "react";
import { cn } from "@/lib/utils";

/** Eingabefeld mit schwebendem Label; der Rand wird beim Fokus taxi-gelb. */
export function FloatingInput({ label, id, className, ...props }: React.ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        className={cn(
          "peer h-14 w-full rounded-xl border border-input bg-white/[0.04] px-4 pt-5 pb-1.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] duration-300",
          "focus:border-primary focus:shadow-[0_0_0_4px_var(--glow)] aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-4 left-4 origin-left text-[15px] text-muted-foreground transition-[transform,color] duration-200 ease-out peer-focus:-translate-y-2.5 peer-focus:scale-[0.78] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-[0.78]"
      >
        {label}
      </label>
    </div>
  );
}
