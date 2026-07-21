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
    <div className="flex min-h-screen w-full items-center justify-center bg-transparent px-6 py-10 text-white">
      <div className="w-full max-w-sm">
        <Image
          src="/logo.png"
          alt="PayOff logo"
          width={140}
          height={56}
          priority
          className="mx-auto mb-8 w-[140px] [filter:brightness(0)_invert(1)]"
        />

        <div className="surface-card p-7">
          <p className="page-eyebrow">Bentornato</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">Accedi al tuo account</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="field-label">Nome utente</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                className="field-input"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary w-full !min-h-[52px] text-base"
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>
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
