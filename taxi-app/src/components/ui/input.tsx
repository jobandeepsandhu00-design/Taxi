import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-xl border border-input bg-muted px-3.5 text-sm text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 [color-scheme:inherit] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />;
}
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-11 cursor-pointer pr-8", className)} {...props} />;
}
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-semibold text-navy", className)} {...props} />;
}
function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs font-medium text-destructive">{messages.join(" ")}</p>;
}

export { Input, Textarea, Select, Label, FieldError };
