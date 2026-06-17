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

function BadgePills({ badges }: { badges: BadgeSummary[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {badges.map((b) => (
        <span
          key={b.achievement_id}
          className="inline-flex items-center gap-1 text-xs font-medium bg-[#f0fdf4] text-[#166534] px-2 py-0.5 rounded-full border border-[#bbf7d0]"
        >
          <span className="font-semibold">{b.count}x</span>
          <span>{b.icon}</span>
          <span>{b.name}</span>
        </span>
      ))}
    </div>
  );
}

async function fetchRanking(tab: Tab): Promise<RankingEntry[]> {
  const supabase = createClient();

  // Build the time filter in Sao Paulo time (UTC-3, fixed, no DST)
  let timeFilter = "";
  const now = new Date();

  if (tab === "hoje") {
    // Today in SP: from 00:00 SP (= 03:00 UTC) to now
    const spNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const spMidnight = new Date(spNow);
    spMidnight.setUTCHours(0, 0, 0, 0);
    const utcMidnight = new Date(spMidnight.getTime() + 3 * 60 * 60 * 1000);
    timeFilter = utcMidnight.toISOString();
  } else if (tab === "semana") {
    // This week in SP: from Monday 00:00 SP
    const spNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const day = spNow.getUTCDay(); // 0=Sun, 1=Mon
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

  if (timeFilter) {
    q = q.gte("created_at", timeFilter);
  }

  const { data, error } = await q;
  if (error) throw error;

  // Group by user_id
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

  // Fetch badges for all users in this ranking
  const userIds = Object.keys(totals);
  if (userIds.length > 0) {
    const { data: badgeRows } = await supabase
      .from("user_achievements")
      .select("user_id, achievement_id, achievements(name, icon)")
      .in("user_id", userIds);

    // Initialize badges arrays (guard against missing rows)
    for (const entry of Object.values(totals)) {
      entry.badges = [];
    }

    // Group by user_id + achievement_id to compute count
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

    // Attach to entries, sorted by count descending
    for (const entry of Object.values(totals)) {
      const userBadges = badgeMap[entry.user_id] ?? {};
      entry.badges = Object.values(userBadges).sort((a, b) => b.count - a.count);
    }
  }

  return Object.values(totals).sort((a, b) => b.total_ml - a.total_ml);
}

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
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${
                tab === t.id
                  ? "bg-[#0891b2] text-white"
                  : "bg-[#f8fafc] text-[#64748b]"
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
          {entries.map((entry, i) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-2xl ${
                i === 0 ? "bg-[#fef9c3]" : "bg-white border border-[#e2e8f0]"
              }`}
            >
              <div className="w-8 text-center flex-shrink-0">
                {i < 3 ? (
                  <span className="text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-sm font-bold text-[#64748b]">{i + 1}</span>
                )}
              </div>
              <Avatar displayName={entry.display_name} avatarUrl={entry.avatar_url} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0f172a] truncate">{entry.display_name}</p>
                <BadgePills badges={entry.badges} />
              </div>
              <div className="flex items-center gap-1 bg-[#ecfeff] px-3 py-1.5 rounded-full flex-shrink-0">
                <span>💧</span>
                <span className="font-bold text-[#0891b2] text-sm">
                  {entry.total_ml >= 1000
                    ? `${(entry.total_ml / 1000).toFixed(1)}L`
                    : `${entry.total_ml}ml`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
