"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, BookHeart, ShieldCheck, Sparkles } from "lucide-react"
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { StoryShell } from "@/components/story/story-shell"
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client"
import { mapFirebaseError } from "@/lib/firebase/errors"

export function LoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get("next") || "/account"
  const configured = isFirebaseConfigured()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fb = getFirebase()
    if (!fb) return
    return onAuthStateChanged(fb.auth, (user) => {
      if (user) router.replace(next)
    })
  }, [router, next])

  async function signInWithGoogle() {
    const fb = getFirebase()
    if (!fb) {
      setError("Firebase is not configured in .env.local.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const cred = await signInWithPopup(fb.auth, new GoogleAuthProvider())
      const { ensureUserProfile } = await import("@/lib/firebase/users")
      await ensureUserProfile(cred.user)
      router.replace(next)
    } catch (e) {
      setError(mapFirebaseError(e, "Could not sign in. Try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <StoryShell>
      <header className="safe-top flex items-center px-4 py-3 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-white/90 shadow-sm"
        >
          <Link href="/" aria-label="Back to stories">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-4 pb-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-[1.75rem] border border-[var(--story-line)] bg-white shadow-[0_20px_50px_rgba(18,32,28,0.08)]"
          >
            <div className="relative px-6 pb-2 pt-8 text-center">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28"
                style={{
                  background:
                    "radial-gradient(80% 120% at 50% 0%, rgba(45,212,191,0.35), transparent 70%)",
                }}
                aria-hidden
              />
              <p
                className="relative text-3xl font-semibold tracking-tight text-[var(--story-ink)]"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                Storylink
              </p>
              <h1 className="relative mt-3 text-xl font-semibold text-[var(--story-ink)]">
                Welcome back
              </h1>
              <p className="relative mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--story-muted)]">
                Sign in to sync progress, save favorites, and leave tips for other players.
              </p>
            </div>

            <ul className="space-y-2.5 px-6 py-5">
              <Perk icon={<BookHeart className="size-4" />} text="Save every story you start" />
              <Perk icon={<Sparkles className="size-4" />} text="Keep scores & endings on your account" />
              <Perk icon={<ShieldCheck className="size-4" />} text="Favorites and tips stay with you" />
            </ul>

            <div className="space-y-3 px-6 pb-8">
              {!configured ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                  Firebase keys missing in `.env.local`.
                </p>
              ) : (
                <Button
                  type="button"
                  className="h-12 w-full rounded-2xl bg-[var(--story-ink)] text-base font-semibold text-white hover:bg-[var(--story-ink)]/90"
                  disabled={busy}
                  onClick={() => void signInWithGoogle()}
                >
                  <GoogleGlyph />
                  {busy ? "Signing in…" : "Continue with Google"}
                </Button>
              )}
              {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
              <p className="text-center text-[11px] leading-relaxed text-[var(--story-muted)]">
                By continuing you agree to use Storylink for personal storytelling. You can browse
                stories without an account.
              </p>
              <Button asChild variant="ghost" className="w-full rounded-xl text-[var(--story-muted)]">
                <Link href="/">Browse stories instead</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </StoryShell>
  )
}

function Perk({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-[var(--story-bg)]/80 px-3 py-2.5 text-sm text-[var(--story-ink)]">
      <span className="flex size-8 items-center justify-center rounded-full bg-[var(--story-accent-soft)] text-[var(--story-accent)]">
        {icon}
      </span>
      {text}
    </li>
  )
}

function GoogleGlyph() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#fff"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#fff"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#fff"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#fff"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
