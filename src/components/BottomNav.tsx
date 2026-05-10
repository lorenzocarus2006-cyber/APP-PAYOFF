"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/panoramica-link", icon: "🔗", label: "Panoramica Link" },
  { href: "/affiliati", icon: "👥", label: "Affiliati" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] w-full max-w-5xl items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-[110px] flex-col items-center justify-center rounded-xl px-2 ${
                isActive ? "text-[#0066ff]" : "text-slate-500"
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
