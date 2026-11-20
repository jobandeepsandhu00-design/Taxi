"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fontSize: 11, fill: "#94a3b8" };
const tooltipStyle = { borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(21,27,43,0.95)", color: "#e8edf5", fontSize: 12, boxShadow: "0 12px 32px -12px rgba(0,0,0,.6)" };
const grid = "rgba(148,163,184,0.15)";
const anim = { animationDuration: 900, animationEasing: "ease-out" as const };

export function DailyChart({ data }: { data: { label: string; minutes: number; answered: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--glow)" }} formatter={(v, n) => [n === "minutes" ? `${v} Min.` : v, n === "minutes" ? "Lernzeit" : "Fragen"]} />
        <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={22} {...anim} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnsweredChart({ data }: { data: { label: string; answered: number; correct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gAnswered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === "answered" ? "Beantwortet" : "Richtig"]} />
        <Area type="monotone" dataKey="answered" stroke="var(--primary)" strokeWidth={2} fill="url(#gAnswered)" {...anim} />
        <Area type="monotone" dataKey="correct" stroke="#22c55e" strokeWidth={2} fill="url(#gCorrect)" {...anim} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AccuracyTrendChart({ data }: { data: { label: string; accuracy: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, "Trefferquote"]} />
        <Line type="monotone" dataKey="accuracy" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} {...anim} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExamHistoryChart({ data, passLine }: { data: { label: string; score: number }[]; passLine: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, "Ergebnis"]} />
        <ReferenceLine y={passLine} stroke="#22c55e" strokeDasharray="6 4" label={{ value: `Bestehen ${passLine} %`, fontSize: 11, fill: "#22c55e", position: "insideTopRight" }} />
        <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} {...anim} />
      </LineChart>
    </ResponsiveContainer>
  );
}
