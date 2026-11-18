import { BadgeCheck, FlaskConical, PencilLine } from "lucide-react";
import type { ContentOrigin } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function OriginBadge({ origin, verifiedSource }: { origin: ContentOrigin; verifiedSource?: boolean }) {
  if (origin === "OFFICIAL" && verifiedSource !== false) {
    return (
      <Badge variant="success" title="Aus verifizierter offizieller Quelle">
        <BadgeCheck className="size-3" /> Offiziell
      </Badge>
    );
  }
  if (origin === "DEMO") {
    return (
      <Badge variant="warning" title="Demo-Frage – eigenständig erstellt, keine offizielle Prüfungsfrage">
        <FlaskConical className="size-3" /> Demo-Frage
      </Badge>
    );
  }
  return (
    <Badge variant="muted" title="Eigenständig erstellte Übungsfrage – keine offizielle Prüfungsfrage">
      <PencilLine className="size-3" /> Übungsfrage
    </Badge>
  );
}
