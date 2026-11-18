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

const axis = { fontSize: 11, fill: "#5b6785" };
const tooltipStyle = { borderRadius: 12, border: "1px solid #e3e8f2", fontSize: 12, boxShadow: "0 8px 24px -12px rgba(11,31,75,.25)" };

export function DailyChart({ data }: { data: { label: string; minutes: number; answered: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f8" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f3f6fb" }} formatter={(v, n) => [n === "minutes" ? `${v} Min.` : v, n === "minutes" ? "Lernzeit" : "Fragen"]} />
        <Bar dataKey="minutes" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={22} />
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
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f8" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === "answered" ? "Beantwortet" : "Richtig"]} />
        <Area type="monotone" dataKey="answered" stroke="#6366f1" strokeWidth={2} fill="url(#gAnswered)" />
        <Area type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} fill="url(#gCorrect)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AccuracyTrendChart({ data }: { data: { label: string; accuracy: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f8" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, "Trefferquote"]} />
        <Line type="monotone" dataKey="accuracy" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, fill: "#1d4ed8" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExamHistoryChart({ data, passLine }: { data: { label: string; score: number }[]; passLine: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f8" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, "Ergebnis"]} />
        <ReferenceLine y={passLine} stroke="#059669" strokeDasharray="6 4" label={{ value: `Bestehen ${passLine} %`, fontSize: 11, fill: "#059669", position: "insideTopRight" }} />
        <Line type="monotone" dataKey="score" stroke="#0b1f4b" strokeWidth={3} dot={{ r: 4, fill: "#0b1f4b" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
