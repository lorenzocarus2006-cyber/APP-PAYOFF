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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex h-[60px] w-full max-w-[480px] items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-[100px] flex-col items-center justify-center rounded-2xl px-2 ${
                isActive ? "bg-[#EEF4FF] text-[#2D7DD2]" : "text-[#6B7280]"
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
