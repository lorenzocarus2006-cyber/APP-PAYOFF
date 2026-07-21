"use client";

import { useEffect } from "react";
import { money } from "./shared";

type Props = {
  title: string;
  subtitle: string;
  items: { label: string; value: number }[];
  onClose: () => void;
};

export default function SummaryListModal({ title, subtitle, items, onClose }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full flex-col rounded-t-[26px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:max-w-md sm:rounded-[22px]"
        style={{ backgroundColor: "#0F1420" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] p-5">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/50">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg font-bold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Nessun dato disponibile.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
                >
                  <span className="font-semibold text-white/75">{item.label}</span>
                  <span className="font-extrabold text-white">{money(item.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
