"use client";

import { HardDrive, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { audioCacheInfo, clearAudioCache, formatMb } from "@/lib/audio/offline";

/** Heruntergeladene Audios (Offline) anzeigen und löschen. */
export function AudioStorageCard() {
  const [info, setInfo] = useState<{ files: number; bytes: number } | null>(null);
  useEffect(() => {
    void audioCacheInfo().then(setInfo);
  }, []);
  return (
    <Card data-testid="audio-storage">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-5 text-link" /> Speicher verwalten
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{info === null ? "Wird berechnet …" : info.files === 0 ? "Keine Audios heruntergeladen." : `${info.files} Audiodateien offline · ${formatMb(info.bytes)}`}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={!info?.files}
          onClick={async () => {
            await clearAudioCache();
            setInfo({ files: 0, bytes: 0 });
          }}
        >
          <Trash2 /> Downloads löschen
        </Button>
      </CardContent>
    </Card>
  );
}
