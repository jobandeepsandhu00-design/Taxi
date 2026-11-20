"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

const LEVELS = ["bg-foreground/[0.07]", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];
const MONTHS = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function level(n: number) {
  if (n <= 0) return 0;
  if (n < 5) return 1;
  if (n < 15) return 2;
  if (n < 30) return 3;
  return 4;
}

/** Lernkalender im GitHub-Stil: eine Spalte pro Woche (Mo–So), Farbe nach beantworteten Fragen. */
export function LearningHeatmap({ days }: { days: { day: string; answered: number }[] }) {
  // Auf Montag ausrichten
  const first = new Date(`${days[0].day}T00:00:00Z`);
  const pad = (first.getUTCDay() + 6) % 7;
  const cells: ({ day: string; answered: number } | null)[] = [...Array(pad).fill(null), ...days];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const activeDays = days.filter((d) => d.answered > 0).length;
  const scroller = useRef<HTMLDivElement>(null);
  // Aktuellste Wochen zuerst sichtbar
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  return (
    <div>
      <div ref={scroller} className="no-scrollbar overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
            {weeks.map((w, i) => {
              const firstDay = w.find(Boolean);
              const d = firstDay ? new Date(`${firstDay.day}T00:00:00Z`) : null;
              const show = d && d.getUTCDate() <= 7;
              return (
                <span key={i} className="w-3 overflow-visible whitespace-nowrap">
                  {show ? MONTHS[d!.getUTCMonth()] : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1">
            <div className="flex w-6 flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
              <span>Mo</span>
              <span>Do</span>
              <span>So</span>
            </div>
            <div className="flex gap-[3px]" role="img" aria-label={`Lernkalender: an ${activeDays} von ${days.length} Tagen gelernt`}>
              {weeks.map((w, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }, (_, di) => {
                    const c = w[di];
                    if (!c) return <span key={di} className="size-3" />;
                    return (
                      <motion.span
                        key={di}
                        title={`${c.day.split("-").reverse().join(".")}: ${c.answered} ${c.answered === 1 ? "Frage" : "Fragen"}`}
                        className={`size-3 rounded-[3px] ${LEVELS[level(c.answered)]}`}
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: wi * 0.018 + di * 0.004, duration: 0.25 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{activeDays} Lerntage in den letzten {Math.round(days.length / 7)} Wochen</span>
        <span className="flex items-center gap-1">
          weniger {LEVELS.map((l) => <span key={l} className={`size-2.5 rounded-[2px] ${l}`} />)} mehr
        </span>
      </div>
    </div>
  );
}
