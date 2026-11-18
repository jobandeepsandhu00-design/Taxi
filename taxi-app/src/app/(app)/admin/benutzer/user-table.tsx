"use client";

import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { deleteUserAction, updateUserAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

interface U {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  answers: number;
  exams: number;
  passedAny: boolean;
}

export function UserTable({ users, currentUserId }: { users: U[]; currentUserId: string }) {
  const { run, pending, error, message } = useAction();
  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60 text-left text-xs font-bold text-muted-foreground uppercase">
            <tr><th className="p-3">Benutzer</th><th className="p-3">Rolle</th><th className="p-3">Status</th><th className="p-3">Aktivität</th><th className="p-3">Registriert</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3"><p className="font-semibold text-navy">{u.name}{u.id === currentUserId && <span className="ml-1 text-xs text-muted-foreground">(du)</span>}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                <td className="p-3">
                  <Select
                    className="h-9 w-36"
                    value={u.role}
                    disabled={pending || u.id === currentUserId}
                    onChange={(e) => run(() => updateUserAction(u.id, { role: e.target.value as U["role"] }), { confirm: `Rolle von ${u.name} ändern?` })}
                    aria-label="Rolle"
                  >
                    <option value="STUDENT">Lernende/r</option>
                    <option value="ADMIN">Administrator</option>
                  </Select>
                </td>
                <td className="p-3">
                  <button type="button" disabled={pending || u.id === currentUserId} onClick={() => run(() => updateUserAction(u.id, { isActive: !u.isActive }))} className="disabled:opacity-60" title="Status umschalten">
                    {u.isActive ? <Badge variant="success">aktiv</Badge> : <Badge variant="destructive">deaktiviert</Badge>}
                  </button>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{u.answers} Antworten · {u.exams} Prüfungen {u.passedAny && <Badge variant="success" className="ml-1">bestanden</Badge>}<br />Letzter Login: {u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "–"}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                <td className="p-3 text-right">
                  {u.id !== currentUserId && (
                    <Button size="icon" variant="ghost" className="text-destructive" aria-label="Benutzer löschen" disabled={pending} onClick={() => run(() => deleteUserAction(u.id), { confirm: `${u.name} und alle Lerndaten endgültig löschen?` })}>
                      <Trash2 />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
