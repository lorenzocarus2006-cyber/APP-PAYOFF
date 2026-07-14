import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client Supabase per Server Components / Route Handlers, sessione letta dai cookie. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // set() chiamato da un Server Component: il proxy si occupa di rinfrescare la sessione.
          }
        },
      },
    },
  );
}
