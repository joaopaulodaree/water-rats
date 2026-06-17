"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Feed",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path
          d="M3 5h18M3 10h18M3 15h12"
          stroke={active ? "#0891b2" : "#94a3b8"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/ranking",
    label: "Ranking",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path
          d="M8 17V9M12 17V5M16 17v-5"
          stroke={active ? "#0891b2" : "#94a3b8"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  // FAB placeholder
  { href: null, label: "", icon: () => null },
  {
    href: "/achievements",
    label: "Badges",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="10" r="4" stroke={active ? "#0891b2" : "#94a3b8"} strokeWidth="2" />
        <path
          d="M8 14l-2 6 6-2 6 2-2-6"
          stroke={active ? "#0891b2" : "#94a3b8"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3" stroke={active ? "#0891b2" : "#94a3b8"} strokeWidth="2" />
        <path
          d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6"
          stroke={active ? "#0891b2" : "#94a3b8"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface BottomNavProps {
  onLogWater: () => void;
}

export function BottomNav({ onLogWater }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0] bottom-nav-safe"
      style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center h-16">
        {TABS.map((tab, i) => {
          if (!tab.href) {
            return (
              <div key="fab" className="flex-1 flex justify-center">
                <button
                  onClick={onLogWater}
                  aria-label="Registrar água"
                  className="w-14 h-14 bg-[#0891b2] hover:bg-[#0e7490] rounded-full flex items-center justify-center shadow-lg transition-colors -mt-5"
                >
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          }

          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
              aria-current={active ? "page" : undefined}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? "text-[#0891b2]" : "text-[#94a3b8]"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
