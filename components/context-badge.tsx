"use client";

import { useState } from "react";
import { getContextLabel } from "@/lib/context-label";

interface ContextBadgeProps {
  amountMl: number;
  createdAt: string;
}

interface ColorScheme {
  bg: string;
  text: string;
  border: string;
  tooltip: string;
}

// Color mapped by the emoji at the end of the label text
const EMOJI_COLORS: Record<string, ColorScheme> = {
  "🐬": { bg: "#e0f2fe", text: "#075985", border: "#7dd3fc", tooltip: "#0c4a6e" },      // golfinho — sky
  "🐠": { bg: "#ecfeff", text: "#164e63", border: "#67e8f9", tooltip: "#0c4a6e" },      // aquário — cyan
  "🐀": { bg: "#f0fdf4", text: "#166534", border: "#86efac", tooltip: "#14532d" },      // rato d'água — green
  "🫧": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd", tooltip: "#1e3a8a" },      // glub glub — blue
  "🌵": { bg: "#fff7ed", text: "#9a3412", border: "#fdba74", tooltip: "#7c2d12" },      // seca — orange
  "👻": { bg: "#f5f3ff", text: "#4c1d95", border: "#a78bfa", tooltip: "#3b0764" },      // fantasma — violet
  "🌅": { bg: "#fff7ed", text: "#c2410c", border: "#fb923c", tooltip: "#7c2d12" },      // madrugador — warm orange
  "💧": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", tooltip: "#1e3a8a" },      // bom dia — blue
  "🍽️": { bg: "#fef9c3", text: "#854d0e", border: "#fde047", tooltip: "#713f12" },     // almoço — yellow
  "🫠": { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4", tooltip: "#831843" },      // soninho — pink
  "😎": { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd", tooltip: "#4c1d95" },      // expediente — purple
  "🌙": { bg: "#1e1b4b", text: "#c7d2fe", border: "#6366f1", tooltip: "#312e81" },      // boa noite — indigo dark
  "🦉": { bg: "#1e1b4b", text: "#e0e7ff", border: "#818cf8", tooltip: "#1e1b4b" },      // coruja — deep indigo
  "😈": { bg: "#4c0519", text: "#fecdd3", border: "#f43f5e", tooltip: "#881337" },      // 666 — deep red
  "🎰": { bg: "#fef9c3", text: "#92400e", border: "#fbbf24", tooltip: "#78350f" },      // jackpot — gold
  "🌿": { bg: "#f0fdf4", text: "#166534", border: "#4ade80", tooltip: "#14532d" },      // 420 — green
  "🖥️": { bg: "#0f172a", text: "#00ff88", border: "#00cc6a", tooltip: "#0f172a" },     // hacker — terminal green
  "💯": { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", tooltip: "#7f1d1d" },      // centavinho — red
  "🎯": { bg: "#ecfdf5", text: "#065f46", border: "#34d399", tooltip: "#022c22" },      // milênio — emerald
  "⭐": { bg: "#fef3c7", text: "#92400e", border: "#fcd34d", tooltip: "#78350f" },      // pedido — amber
  "🕛": { bg: "#18181b", text: "#e4e4e7", border: "#71717a", tooltip: "#09090b" },      // meia-noite — zinc dark
};

const DEFAULT_SCHEME: ColorScheme = {
  bg: "#f1f5f9",
  text: "#475569",
  border: "#e2e8f0",
  tooltip: "#0f172a",
};

function getScheme(text: string): ColorScheme {
  // Find the emoji at the end of the text
  const match = text.match(/(\p{Emoji_Presentation}|\p{Emoji}️?)(?:\s*)$/u);
  if (match) {
    const emoji = match[1];
    const found = EMOJI_COLORS[emoji];
    if (found) return found;
  }
  return DEFAULT_SCHEME;
}

export function ContextBadge({ amountMl, createdAt }: ContextBadgeProps) {
  const [open, setOpen] = useState(false);
  const label = getContextLabel(amountMl, createdAt);
  const scheme = getScheme(label.text);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold border transition-all active:scale-95"
        style={{
          background: scheme.bg,
          color: scheme.text,
          borderColor: scheme.border,
        }}
      >
        {label.text}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-0 mb-2 z-20 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-lg"
            style={{ background: scheme.tooltip }}
          >
            {label.description}
            <div
              className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
              style={{ borderTopColor: scheme.tooltip }}
            />
          </div>
        </>
      )}
    </div>
  );
}
