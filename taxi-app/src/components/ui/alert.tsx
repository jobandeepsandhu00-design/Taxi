import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const styles = {
  info: { box: "border-primary/30 bg-primary/10 text-foreground [&>svg]:text-link", Icon: Info },
  success: { box: "border-success/30 bg-success/10 text-foreground [&>svg]:text-success", Icon: CheckCircle2 },
  warning: { box: "border-warning/30 bg-warning/10 text-foreground [&>svg]:text-warning", Icon: AlertTriangle },
  error: { box: "border-destructive/30 bg-destructive/10 text-foreground [&>svg]:text-destructive", Icon: XCircle },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
