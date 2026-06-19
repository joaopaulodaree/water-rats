"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { NewAchievement } from "@/app/(app)/layout";

const ML_PRESETS = [200, 350, 500, 750, 1000];


interface LogWaterSheetProps {
  onClose: () => void;
  onAchievements: (achievements: NewAchievement[]) => void;
}

type Step = "photo" | "amount" | "caption";

export function LogWaterSheet({ onClose, onAchievements }: LogWaterSheetProps) {
  const [step, setStep] = useState<Step>("photo");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [amountMl, setAmountMl] = useState<number>(500);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    });
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    setStep("amount");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sessão expirada."); setSubmitting(false); return; }

    // 0b. Ensure profile exists (users created before the trigger was applied)
    await supabase.from("profiles").upsert({
      id: user.id,
      display_name:
        user.user_metadata?.display_name ??
        user.user_metadata?.username ??
        user.email?.split("@")[0] ??
        "?",
    }, { onConflict: "id", ignoreDuplicates: true });

    // 1. INSERT log (photo_url null)
    const { data: log, error: insertErr } = await supabase
      .from("water_logs")
      .insert({ user_id: user.id, amount_ml: amountMl, caption: caption || null })
      .select("id")
      .single();

    if (insertErr || !log) {
      setError("Erro ao salvar. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // 2. Upload photo if present
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${log.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("water-logs-photos")
        .upload(path, photoFile, { cacheControl: "31536000", upsert: false });

      if (uploadErr) {
        setError(`Foto não enviada: ${uploadErr.message}. Registro salvo sem ela.`);
        supabase.rpc("check_achievements", { p_user_id: user.id, p_log_id: log.id }).then(async ({ data: newIds }) => {
          if (newIds && newIds.length > 0) {
            const { data: achs } = await supabase.from("achievements").select("icon, name, description").in("id", newIds);
            if (achs && achs.length > 0) onAchievements(achs);
          }
        }).catch((err) => console.error("Error checking achievements:", err));
        qc.invalidateQueries({ queryKey: ["feed"] });
        qc.invalidateQueries({ queryKey: ["ranking"] });
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("water-logs-photos")
        .getPublicUrl(path);
      // 3. UPDATE with photo_url
      await supabase
        .from("water_logs")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", log.id);
    }

    // 4. check_achievements (fire-and-forget)
    supabase
      .rpc("check_achievements", { p_user_id: user.id, p_log_id: log.id })
      .then(async ({ data: newIds }) => {
        if (newIds && newIds.length > 0) {
          const { data: achs } = await supabase
            .from("achievements")
            .select("icon, name, description")
            .in("id", newIds);
          if (achs && achs.length > 0) onAchievements(achs);
        }
      })
      .catch((err) => console.error("Error checking achievements:", err));

    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
    setSubmitting(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#e2e8f0] rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0f172a]">
              {step === "photo" ? "Adicionar foto" : step === "amount" ? "Quantos ml?" : "Legenda"}
            </h2>
            <button onClick={onClose} className="text-[#64748b] text-2xl leading-none" aria-label="Fechar">×</button>
          </div>

          {/* STEP 1 — Photo */}
          {step === "photo" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-[#e2e8f0] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#64748b] hover:border-[#0891b2] hover:text-[#0891b2] transition-colors"
              >
                <span className="text-4xl">📷</span>
                <span className="font-medium">Tirar foto ou escolher da galeria</span>
              </button>
            </div>
          )}

          {/* STEP 2 — Amount */}
          {step === "amount" && (
            <div className="space-y-5">
              {photoPreview && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden">
                  <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                </div>
              )}

              {/* Presets */}
              <div className="grid grid-cols-5 gap-2">
                {ML_PRESETS.map((ml) => (
                  <button
                    key={ml}
                    onClick={() => setAmountMl(ml)}
                    className={`h-12 rounded-xl font-semibold text-sm transition-colors ${
                      amountMl === ml
                        ? "bg-[#0891b2] text-white"
                        : "bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0]"
                    }`}
                  >
                    {ml}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={amountMl}
                  onChange={(e) => setAmountMl(Number(e.target.value))}
                  className="flex-1 h-12 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172a] text-base text-center font-semibold focus:outline-none focus:border-[#0891b2]"
                />
                <span className="text-[#64748b] font-medium">ml</span>
              </div>

              <button
                onClick={() => setStep("caption")}
                disabled={!amountMl || amountMl < 1 || amountMl > 5000}
                className="w-full h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 3 — Caption + Post */}
          {step === "caption" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#64748b]">
                <span className="text-2xl">💧</span>
                <span className="font-bold text-[#0f172a] text-xl">{amountMl} ml</span>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legenda (opcional)…"
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#0f172a] text-base resize-none focus:outline-none focus:border-[#0891b2]"
              />

              {error && <p className="text-sm text-[#ef4444]">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white font-bold rounded-xl transition-colors disabled:opacity-60"
              >
                {submitting ? "Postando…" : "Postar 💧"}
              </button>

              <button
                onClick={() => setStep("amount")}
                className="w-full text-center text-sm text-[#64748b]"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
