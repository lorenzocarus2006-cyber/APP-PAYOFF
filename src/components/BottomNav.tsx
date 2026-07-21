"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Landmark, Link2, Target, Users } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/panoramica-link", icon: Link2, label: "Link" },
  { href: "/affiliati", icon: Users, label: "Affiliati" },
  { href: "/lead", icon: Target, label: "Lead" },
  { href: "/promemoria", icon: Bell, label: "Promemoria" },
  { href: "/bilancio", icon: Landmark, label: "Bilancio" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#080A10]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] w-full max-w-[480px] items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                  isActive ? "bg-[#2D5BE3]/20 text-[#7ea0ff]" : "text-white/40"
                }`}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span
                className={`text-[10px] tracking-tight ${
                  isActive ? "font-bold text-white" : "font-semibold text-white/40"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
