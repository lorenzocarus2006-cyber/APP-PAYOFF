"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Landmark, Link2, Target, Users } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/panoramica-link", icon: Link2, label: "Link" },
  { href: "/affiliati", icon: Users, label: "Affiliati" },
  { href: "/bilancio", icon: Landmark, label: "Bilancio" },
  { href: "/lead", icon: Target, label: "Lead" },
  { href: "/promemoria", icon: Bell, label: "Promemoria" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0A0D14]">
      <div className="mx-auto flex h-[60px] w-full max-w-[480px] items-center justify-around px-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${
                isActive ? "text-white" : "text-white/45"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 2} />
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
