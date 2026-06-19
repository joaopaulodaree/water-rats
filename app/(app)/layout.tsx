"use client";

import { useState, useCallback, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { AchievementToast } from "@/components/achievement-toast";
import { LogWaterSheet } from "@/components/log-water-sheet";

export interface NewAchievement {
  icon: string;
  name: string;
  description: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingAchievements, setPendingAchievements] = useState<NewAchievement[]>([]);

  const handleAchievements = useCallback((achievements: NewAchievement[]) => {
    if (achievements.length > 0) setPendingAchievements(achievements);
  }, []);

  useEffect(() => {
    const handleNewAchievements = (event: Event) => {
      const data = (event as CustomEvent<NewAchievement[]>).detail;
      if (Array.isArray(data) && data.length > 0) {
        setPendingAchievements(data);
      }
    };

    window.addEventListener("new-achievements", handleNewAchievements as EventListener);
    return () => window.removeEventListener("new-achievements", handleNewAchievements as EventListener);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto pb-safe">
        {children}
      </main>

      <BottomNav onLogWater={() => setSheetOpen(true)} />

      {sheetOpen && (
        <LogWaterSheet
          onClose={() => setSheetOpen(false)}
          onAchievements={handleAchievements}
        />
      )}

      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onDismiss={() => setPendingAchievements([])}
        />
      )}
    </div>
  );
}
