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

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#0f172a]">🏅 Conquistas</h1>
        {achievements.length > 0 && (
          <p className="text-sm text-[#64748b] mt-1">
            {earnedCount} de {achievements.length} desbloqueadas
          </p>
        )}
      </div>

      {status === "pending" ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 grid grid-cols-1 gap-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-opacity ${
                ach.earned
                  ? "bg-white border-[#0891b2]/30 shadow-sm"
                  : "bg-[#f8fafc] border-[#e2e8f0] opacity-50"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                  ach.earned ? "bg-[#ecfeff]" : "bg-[#f1f5f9]"
                }`}
              >
                {ach.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0f172a]">{ach.name}</p>
                <p className="text-sm text-[#64748b] mt-0.5">{ach.description}</p>
                {ach.earned && ach.earned_at && (
                  <p className="text-xs text-[#0891b2] mt-1 font-medium">
                    Conquistada em {new Date(ach.earned_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              {ach.earned && (
                <span className="text-[#0891b2] text-xl flex-shrink-0">✓</span>
              )}
            </div>
          ))}

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
