"use client";

import { useState } from "react";
import { getContextLabel } from "@/lib/context-label";

interface ContextBadgeProps {
  amountMl: number;
  createdAt: string;
}

export function ContextBadge({ amountMl, createdAt }: ContextBadgeProps) {
  const [open, setOpen] = useState(false);
  const label = getContextLabel(amountMl, createdAt);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] hover:bg-[#e2e8f0] transition-colors"
      >
        {label.text}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 z-20 bg-[#0f172a] text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-lg">
            {label.description}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#0f172a]" />
          </div>
        </>
      )}
    </div>
  );
}
