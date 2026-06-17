"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { logout } from "@/app/actions/auth";
import { useEffect, useState } from "react";

interface ProfileStats {
  display_name: string;
  avatar_url: string | null;
  total_logs: number;
  total_ml: number;
  achievements_earned: number;
  member_since: string;
}

async function fetchProfile(userId: string): Promise<ProfileStats> {
  const supabase = createClient();

  const [{ data: { user } }, { data: profile }, { data: logs }, { data: earned }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name, avatar_url, account_created_at").eq("id", userId).single(),
    supabase.from("water_logs").select("amount_ml").eq("user_id", userId),
    supabase.from("user_achievements").select("id").eq("user_id", userId),
  ]);

  // Fall back to auth metadata when profiles row doesn't exist yet (trigger not applied)
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.username ??
    "?";

  const totalMl = (logs ?? []).reduce((sum, l) => sum + l.amount_ml, 0);

  return {
    display_name: displayName,
    avatar_url: profile?.avatar_url ?? null,
    total_logs: (logs ?? []).length,
    total_ml: totalMl,
    achievements_earned: (earned ?? []).length,
    member_since: profile?.account_created_at ?? user?.created_at ?? new Date().toISOString(),
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f8fafc] rounded-2xl p-4 text-center">
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
      <p className="text-xs text-[#64748b] mt-1 font-medium">{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: profile, status } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== null,
    staleTime: 60 * 1000,
  });

  if (status === "pending") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const totalLiters = profile.total_ml >= 1000
    ? `${(profile.total_ml / 1000).toFixed(1)}L`
    : `${profile.total_ml}ml`;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#0f172a]">Perfil</h1>
      </div>

      <div className="px-4 py-6 flex flex-col items-center">
        <Avatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          size={80}
          className="mb-3"
        />
        <h2 className="text-2xl font-bold text-[#0f172a]">{profile.display_name}</h2>
        <p className="text-sm text-[#64748b] mt-1">
          Membro desde {new Date(profile.member_since).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Registros" value={String(profile.total_logs)} />
        <StatCard label="Total bebido" value={totalLiters} />
        <StatCard label="Conquistas" value={String(profile.achievements_earned)} />
      </div>

      <div className="px-4">
        <form action={logout}>
          <button
            type="submit"
            className="w-full h-12 border border-[#e2e8f0] text-[#64748b] font-semibold rounded-xl hover:bg-[#f8fafc] transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
