"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { useState } from "react";

type Tab = "hoje" | "semana" | "total";

interface BadgeSummary {
  achievement_id: string;
  name: string;
  icon: string;
  count: number;
}

interface RankingEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_ml: number;
  badges: BadgeSummary[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta Semana" },
  { id: "total", label: "Total" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

// Each badge gets a unique color derived from its id — no two look the same
const BADGE_PALETTES = [
  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" }, // amber
  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" }, // violet
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" }, // pink
  { bg: "#e0f2fe", text: "#075985", border: "#7dd3fc" }, // sky
  { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" }, // orange
  { bg: "#dcfce7", text: "#166534", border: "#86efac" }, // green
  { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" }, // red
  { bg: "#f5f3ff", text: "#4c1d95", border: "#a78bfa" }, // purple
];

function getBadgePalette(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) & 0xffff;
  return BADGE_PALETTES[hash % BADGE_PALETTES.length];
}

function BadgePills({ badges }: { badges: BadgeSummary[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {badges.map((b) => {
        const p = getBadgePalette(b.achievement_id);
        return (
          <span
            key={b.achievement_id}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: p.bg, color: p.text, borderColor: p.border }}
          >
            <span className="font-bold">{b.count}×</span>
            <span>{b.icon}</span>
            <span>{b.name}</span>
          </span>
        );
      })}
    </div>
  );
}

async function fetchRanking(tab: Tab): Promise<RankingEntry[]> {
  const supabase = createClient();

  let timeFilter = "";
  const now = new Date();

  if (tab === "hoje") {
    const spNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const spMidnight = new Date(spNow);
    spMidnight.setUTCHours(0, 0, 0, 0);
    const utcMidnight = new Date(spMidnight.getTime() + 3 * 60 * 60 * 1000);
    timeFilter = utcMidnight.toISOString();
  } else if (tab === "semana") {
    const spNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const day = spNow.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const spMonday = new Date(spNow);
    spMonday.setUTCDate(spNow.getUTCDate() - daysFromMonday);
    spMonday.setUTCHours(0, 0, 0, 0);
    const utcMonday = new Date(spMonday.getTime() + 3 * 60 * 60 * 1000);
    timeFilter = utcMonday.toISOString();
  }

  let q = supabase
    .from("water_logs")
    .select("user_id, amount_ml, profiles!user_id(display_name, avatar_url)");

  if (timeFilter) q = q.gte("created_at", timeFilter);

  const { data, error } = await q;
  if (error) throw error;

  const totals: Record<string, RankingEntry> = {};
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!totals[row.user_id]) {
      totals[row.user_id] = {
        user_id: row.user_id,
        display_name: profile?.display_name ?? "?",
        avatar_url: profile?.avatar_url ?? null,
        total_ml: 0,
        badges: [],
      };
    }
    totals[row.user_id].total_ml += row.amount_ml;
  }

  const userIds = Object.keys(totals);
  if (userIds.length > 0) {
    const { data: badgeRows } = await supabase
      .from("user_achievements")
      .select("user_id, achievement_id, achievements(name, icon)")
      .in("user_id", userIds);

    for (const entry of Object.values(totals)) entry.badges = [];

    const badgeMap: Record<string, Record<string, BadgeSummary>> = {};
    for (const row of badgeRows ?? []) {
      const ach = Array.isArray(row.achievements) ? row.achievements[0] : row.achievements;
      if (!ach) continue;
      if (!badgeMap[row.user_id]) badgeMap[row.user_id] = {};
      const key = row.achievement_id;
      if (!badgeMap[row.user_id][key]) {
        badgeMap[row.user_id][key] = { achievement_id: key, name: ach.name, icon: ach.icon, count: 0 };
      }
      badgeMap[row.user_id][key].count++;
    }

    for (const entry of Object.values(totals)) {
      const userBadges = badgeMap[entry.user_id] ?? {};
      entry.badges = Object.values(userBadges).sort((a, b) => b.count - a.count);
    }
  }

  return Object.values(totals).sort((a, b) => b.total_ml - a.total_ml);
}

// Visual config for top-3 positions
const RANK_STYLES = [
  {
    extraClass: "rank-1-glow rank-1-shimmer relative overflow-hidden",
    background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 55%, #fef3c7 100%)",
    border: "2px solid #fbbf24",
    medalFilter: "drop-shadow(0 0 8px rgba(251,191,36,0.95))",
    medalSize: "2rem",
    amountBg: "rgba(180,130,0,0.12)",
    amountColor: "#92400e",
  },
  {
    extraClass: "rank-2-glow",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 55%, #e2e8f0 100%)",
    border: "2px solid #cbd5e1",
    medalFilter: "drop-shadow(0 0 6px rgba(148,163,184,0.95))",
    medalSize: "1.85rem",
    amountBg: "rgba(100,116,139,0.10)",
    amountColor: "#475569",
  },
  {
    extraClass: "rank-3-glow",
    background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 55%, #fed7aa 100%)",
    border: "2px solid #fb923c",
    medalFilter: "drop-shadow(0 0 6px rgba(251,146,60,0.85))",
    medalSize: "1.85rem",
    amountBg: "rgba(249,115,22,0.12)",
    amountColor: "#9a3412",
  },
] as const;

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>("hoje");

  const { data: entries = [], status } = useQuery({
    queryKey: ["ranking", tab],
    queryFn: () => fetchRanking(tab),
    staleTime: 30 * 1000,
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-white sticky top-0 z-10 border-b border-[#e2e8f0]">
        <h1 className="text-xl font-bold text-[#0f172a] mb-3">🏆 Ranking</h1>
        {/* Segmented control */}
        <div className="flex gap-0 bg-[#f1f5f9] p-1 rounded-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                tab === t.id
                  ? "bg-white text-[#0891b2] shadow-sm"
                  : "text-[#94a3b8] hover:text-[#64748b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {status === "pending" ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <span className="text-6xl mb-4">🏆</span>
          <p className="font-semibold text-[#0f172a] text-lg mb-1">Nenhum registro ainda</p>
          <p className="text-[#64748b] text-sm">Seja o primeiro a registrar água!</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {entries.map((entry, i) => {
            const rs = i < 3 ? RANK_STYLES[i] : null;

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3.5 rounded-2xl ${
                  rs ? rs.extraClass : "bg-white border border-[#e2e8f0] shadow-sm"
                }`}
                style={
                  rs
                    ? { background: rs.background, border: rs.border }
                    : undefined
                }
              >
                {/* Position */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {i < 3 ? (
                    <span
                      style={{
                        fontSize: rs!.medalSize,
                        filter: rs!.medalFilter,
                        lineHeight: 1,
                      }}
                    >
                      {MEDALS[i]}
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xs font-bold text-[#94a3b8]">
                      {i + 1}
                    </span>
                  )}
                </div>

                <Avatar
                  displayName={entry.display_name}
                  avatarUrl={entry.avatar_url}
                  size={44}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0f172a] truncate">
                    {entry.display_name}
                    {i === 0 && (
                      <span className="ml-1 text-base" style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.9))" }}>
                        👑
                      </span>
                    )}
                  </p>
                  <BadgePills badges={entry.badges} />
                </div>

                {/* Water amount */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: rs ? rs.amountBg : "#ecfeff",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>💧</span>
                  <span
                    className="font-extrabold text-sm"
                    style={{ color: rs ? rs.amountColor : "#0891b2" }}
                  >
                    {entry.total_ml >= 1000
                      ? `${(entry.total_ml / 1000).toFixed(1)}L`
                      : `${entry.total_ml}ml`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
