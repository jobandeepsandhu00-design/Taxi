import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLernbuchOverview } from "@/server/lernbuch";

/** Kurzbefehl „Weiterlesen“: springt ins aktuelle Kapitel. */
export default async function LernbuchWeiter() {
  const user = await requireUser();
  const o = await getLernbuchOverview(user.id);
  redirect(o.current ? `/lernbuch/${o.current.topicId}/${o.current.slug}` : "/lernbuch");
}
