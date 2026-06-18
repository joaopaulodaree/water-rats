"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { logout } from "@/app/actions/auth";
import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";

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
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: profile, status } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== null,
    staleTime: 60 * 1000,
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset imediatamente para permitir re-seleção do mesmo arquivo
    e.target.value = "";
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropConfirm(blob: Blob) {
    if (!userId) return;
    const src = cropSrc!;
    setCropSrc(null);
    setUploading(true);
    try {
      const compressed = await imageCompression(blob as File, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 400,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const path = `${userId}/avatar.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("water-logs-photos")
        .upload(path, compressed, { cacheControl: "3600", upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("water-logs-photos")
        .getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    } finally {
      setUploading(false);
      URL.revokeObjectURL(src);
    }
  }

  function handleCropCancel(src: string) {
    setCropSrc(null);
    URL.revokeObjectURL(src);
  }

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
    <>
    {cropSrc && (
      <AvatarCropModal
        src={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => handleCropCancel(cropSrc)}
      />
    )}
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#0f172a]">Perfil</h1>
      </div>

      <div className="px-4 py-6 flex flex-col items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative mb-3 rounded-full"
          aria-label="Trocar foto de perfil"
        >
          <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={80} />
          <span className="absolute bottom-0 right-0 w-7 h-7 bg-[#0891b2] rounded-full flex items-center justify-center text-white text-sm border-2 border-white">
            {uploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "📷"}
          </span>
        </button>
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
    </>
  );
}
