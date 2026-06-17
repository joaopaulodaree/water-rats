"use client";

import { useEffect, useState } from "react";

interface ToastData {
  icon: string;
  name: string;
  description: string;
}

interface AchievementToastProps {
  achievements: ToastData[];
  onDismiss: () => void;
}

export function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (current < achievements.length - 1) {
        setCurrent((c) => c + 1);
      } else {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [current, achievements.length, onDismiss]);

  if (!visible || achievements.length === 0) return null;

  const ach = achievements[current];

  return (
    <div
      className="fixed top-6 left-4 right-4 z-50 flex justify-center"
      style={{ animation: "slideDown 0.2s ease-out" }}
    >
      <div className="bg-[#0f172a] text-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-xl max-w-sm w-full">
        <span style={{ fontSize: 32 }} role="img" aria-label={ach.name}>{ach.icon}</span>
        <div>
          <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">Conquista desbloqueada!</p>
          <p className="font-bold text-base leading-tight">{ach.name}</p>
          <p className="text-xs text-[#94a3b8] mt-0.5">{ach.description}</p>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
