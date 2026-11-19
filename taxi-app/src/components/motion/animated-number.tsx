"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import { useEffect, useState } from "react";

/** Zahl, die beim Einblenden von 0 hochzählt und bei Änderungen animiert. */
export function AnimatedNumber({ value, format, suffix, prefix, className }: { value: number; format?: Format; suffix?: string; prefix?: string; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <NumberFlow value={shown} format={format} suffix={suffix} prefix={prefix} locales="de-AT" className={className} />;
}
