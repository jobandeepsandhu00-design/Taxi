import { redirect } from "next/navigation";

/** Alte Adresse der mündlichen Prüfung → neue Sprechprüfung. */
export default function LegacyOralPage() {
  redirect("/muendlich");
}
