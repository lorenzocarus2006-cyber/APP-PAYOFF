"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@payoff.local`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (signInError) {
      setError("Nome utente o password errati.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-transparent px-5 py-10 text-white">
      <div className="w-full max-w-sm rounded-[24px] border border-white/30 bg-white/15 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
        <Image
          src="/logo.png"
          alt="PayOff logo"
          width={160}
          height={64}
          priority
          className="mx-auto mb-6 w-[160px] [filter:brightness(0)_invert(1)]"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-[13px] font-bold text-white">Nome utente</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-3 text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[13px] font-bold text-white">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-3 text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="min-h-12 w-full rounded-[14px] bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60"
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
