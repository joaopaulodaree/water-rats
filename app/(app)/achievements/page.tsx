"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

// Color palette cycling through vibrant but tasteful gradients
const ACHIEVEMENT_PALETTES = [
  { from: "#fef9c3", to: "#fde68a", icon: "#fbbf24", ring: "#fbbf24", text: "#92400e" },
  { from: "#ede9fe", to: "#ddd6fe", icon: "#8b5cf6", ring: "#a78bfa", text: "#4c1d95" },
  { from: "#fce7f3", to: "#fbcfe8", icon: "#ec4899", ring: "#f9a8d4", text: "#9d174d" },
  { from: "#e0f2fe", to: "#bae6fd", icon: "#0ea5e9", ring: "#7dd3fc", text: "#075985" },
  { from: "#dcfce7", to: "#bbf7d0", icon: "#10b981", ring: "#6ee7b7", text: "#065f46" },
  { from: "#fff7ed", to: "#fed7aa", icon: "#f97316", ring: "#fdba74", text: "#9a3412" },
  { from: "#fef2f2", to: "#fecaca", icon: "#ef4444", ring: "#fca5a5", text: "#991b1b" },
  { from: "#ecfeff", to: "#a5f3fc", icon: "#06b6d4", ring: "#22d3ee", text: "#164e63" },
];

function getPalette(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) & 0xffff;
  return ACHIEVEMENT_PALETTES[hash % ACHIEVEMENT_PALETTES.length];
}

async function fetchAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createClient();

  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from("achievements").select("id, name, description, icon"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
  ]);

  const earnedMap = new Map((earned ?? []).map((e) => [e.achievement_id, e.earned_at]));

  return (all ?? []).map((a) => ({
    ...a,
    earned: earnedMap.has(a.id),
    earned_at: earnedMap.get(a.id) ?? null,
  }));
}

export default function AchievementsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: achievements = [], status } = useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => fetchAchievements(userId!),
    enabled: userId !== null,
    staleTime: 60 * 1000,
  });

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  const progressPct = achievements.length > 0 ? Math.round((earned.length / achievements.length) * 100) : 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#0f172a]">🏅 Conquistas</h1>
        {achievements.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-[#64748b]">
                <span className="font-bold text-[#0891b2]">{earned.length}</span> de {achievements.length} desbloqueadas
              </p>
              <span className="text-xs font-bold text-[#0891b2]">{progressPct}%</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #0891b2, #06b6d4)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {status === "pending" ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">
          {/* Earned badges */}
          {earned.length > 0 && (
            <section>
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-3">
                Desbloqueadas
              </p>
              <div className="grid grid-cols-1 gap-3">
                {earned.map((ach) => {
                  const p = getPalette(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className="flex items-center gap-4 p-4 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
                        boxShadow: `0 0 0 1.5px ${p.ring}55, 0 4px 14px ${p.ring}25`,
                      }}
                    >
                      {/* Icon container with glow */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 achievement-glow"
                        style={{
                          background: `${p.icon}22`,
                          boxShadow: `0 0 0 2px ${p.ring}66, 0 0 12px ${p.icon}44`,
                        }}
                      >
                        {ach.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold" style={{ color: p.text }}>{ach.name}</p>
                        <p className="text-sm mt-0.5 text-[#64748b]">{ach.description}</p>
                        {ach.earned_at && (
                          <p className="text-xs mt-1 font-semibold" style={{ color: p.icon }}>
                            Conquistada em {new Date(ach.earned_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      {/* Checkmark */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: p.icon, color: "#fff" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Locked badges */}
          {locked.length > 0 && (
            <section>
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-3">
                Bloqueadas
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {locked.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 bg-[#f1f5f9] relative">
                      <span className="opacity-30">{ach.icon}</span>
                      <span className="absolute -bottom-0.5 -right-0.5 text-sm">🔒</span>
                    </div>
                    <div className="flex-1 min-w-0 opacity-50">
                      <p className="font-bold text-[#0f172a]">{ach.name}</p>
                      <p className="text-sm text-[#64748b] mt-0.5">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {achievements.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              <span className="text-6xl mb-4">🏅</span>
              <p className="font-semibold text-[#0f172a] text-lg">Nenhuma conquista cadastrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
