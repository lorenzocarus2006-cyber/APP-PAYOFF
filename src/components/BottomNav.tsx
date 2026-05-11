"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/panoramica-link", icon: "🔗", label: "Panoramica Link" },
  { href: "/affiliati", icon: "👥", label: "Affiliati" },
  { href: "/bilancio", icon: "🏦", label: "Bilancio" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/10 backdrop-blur-[20px]">
      <div className="mx-auto flex h-[60px] w-full max-w-[480px] items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-[82px] flex-col items-center justify-center rounded-2xl px-2 ${
                isActive ? "bg-white/20 text-white font-bold" : "text-white/90"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
