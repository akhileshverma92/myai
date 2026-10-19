"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { BookOpen, Bookmark, CheckCircle2, Flame, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebaseUser } from "@/components/story/auth-button"
import { LanguagePicker } from "@/components/story/language-picker"
import { LogoutButton } from "@/components/story/logout-button"
import { StoryShell } from "@/components/story/story-shell"
import { isFirebaseConfigured } from "@/lib/firebase/client"
import { listFavorites, type FavoriteStory } from "@/lib/firebase/favorites"
import type { CloudStoryProgress, UserProfile } from "@/lib/firebase/types"
import { ensureUserProfile, listUserStoryProgress, updatePreferredLanguage } from "@/lib/firebase/users"
import {
  loadPreferredLanguage,
  savePreferredLanguage,
  type StoryLanguage,
} from "@/lib/stories/language"

export function AccountPage() {
  const user = useFirebaseUser()
  const configured = isFirebaseConfigured()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progress, setProgress] = useState<CloudStoryProgress[]>([])
  const [favorites, setFavorites] = useState<FavoriteStory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [language, setLanguage] = useState<StoryLanguage | null>(null)
  const [savingLang, setSavingLang] = useState(false)

  useEffect(() => {
    setLanguage(loadPreferredLanguage())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!configured || !user) {
        setProfile(null)
        setProgress([])
        setFavorites([])
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        const p = await ensureUserProfile(user)
        const [list, favs] = await Promise.all([
          listUserStoryProgress(user.uid),
          listFavorites(user.uid),
        ])
        if (!cancelled) {
          setProfile(p)
          setProgress(list)
          setFavorites(favs)
          if (p?.preferredLanguage) setLanguage(p.preferredLanguage)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error
              ? e.message
              : "Could not load account. Publish firestore.rules in Firebase Console.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, configured])

  async function handleLanguageChange(next: StoryLanguage) {
    setLanguage(next)
    savePreferredLanguage(next)
    if (!user) return
    setSavingLang(true)
    try {
      await updatePreferredLanguage(user.uid, next)
      setProfile((prev) => (prev ? { ...prev, preferredLanguage: next } : prev))
    } catch {
      // local preference still saved
    } finally {
      setSavingLang(false)
    }
  }

  return (
    <StoryShell showNav>
      <header className="safe-top px-4 pb-2 pt-3 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <p
            className="text-2xl font-semibold text-[var(--story-ink)]"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            Profile
          </p>
          <p className="text-xs text-[var(--story-muted)]">Your account, favorites, and progress</p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 sm:px-6">
        <div className="mx-auto w-full max-w-xl space-y-4">
          {!configured ? (
            <div className="story-glass rounded-2xl p-4 text-sm text-[var(--story-muted)]">
              Firebase is not configured. Add keys in `.env.local` to sync stories to your account.
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-[var(--story-line)] bg-white p-5 text-center shadow-sm">
              <p className="text-base font-semibold text-[var(--story-ink)]">Sign in to view your profile</p>
              <p className="mt-1 text-sm text-[var(--story-muted)]">
                Progress, favorites, and tips sync when you&apos;re signed in.
              </p>
              <Button asChild className="mt-4 h-11 rounded-2xl bg-[var(--story-accent)] text-white">
                <Link href="/login?next=/account">Go to login</Link>
              </Button>
            </div>
          ) : loading ? (
            <p className="text-sm text-[var(--story-muted)]">Loading account…</p>
          ) : (
            <>
              {loadError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {loadError}
                </div>
              ) : null}
              <section className="rounded-2xl border border-[var(--story-line)] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt=""
                      className="size-14 rounded-full object-cover ring-2 ring-[var(--story-accent-soft)]"
                    />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-full bg-[var(--story-accent-soft)] text-lg font-bold text-[var(--story-accent)]">
                      {(profile?.displayName || "P").slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-[var(--story-ink)]">
                      {profile?.displayName || user.displayName || "Player"}
                    </h1>
                    <p className="truncate text-xs text-[var(--story-muted)]">
                      {profile?.email || user.email || "Signed in"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat
                    icon={<BookOpen className="size-3.5" />}
                    label="Started"
                    value={profile?.storiesStarted ?? progress.length}
                  />
                  <Stat
                    icon={<CheckCircle2 className="size-3.5" />}
                    label="Finished"
                    value={profile?.storiesCompleted ?? progress.filter((p) => p.status === "completed").length}
                  />
                  <Stat
                    icon={<Flame className="size-3.5" />}
                    label="Active"
                    value={progress.filter((p) => p.status === "in_progress").length}
                  />
                </div>
              </section>

              <section
                className={`rounded-2xl border p-4 shadow-sm ${
                  language
                    ? "border-[var(--story-line)] bg-white"
                    : "border-amber-200 bg-amber-50/80"
                }`}
              >
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--story-ink)]">
                  <Languages className="size-3.5 text-[var(--story-accent)]" />
                  Preferred language
                </h2>
                {!language ? (
                  <p className="mb-3 text-sm text-amber-900">
                    Set English or Hindi — new story chats will follow this language.
                  </p>
                ) : null}
                <LanguagePicker value={language} onChange={handleLanguageChange} askFirst />
                {savingLang ? (
                  <p className="mt-2 text-[11px] text-[var(--story-muted)]">Saving…</p>
                ) : null}
              </section>

              <section>
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--story-ink)]">
                  <Bookmark className="size-3.5 text-[var(--story-accent)]" />
                  Favorites
                </h2>
                {favorites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--story-line)] bg-white/70 px-4 py-5 text-center text-sm text-[var(--story-muted)]">
                    No favorites yet. Open a story and tap <strong>Favorite</strong>.
                  </div>
                ) : (
                  <ul className="mb-5 space-y-2">
                    {favorites.map((fav) => (
                      <li key={fav.storyId}>
                        <Link
                          href={`/story/${fav.storyId}`}
                          className="flex items-center gap-3 rounded-2xl border border-[var(--story-line)] bg-white px-3 py-2.5 shadow-sm"
                        >
                          <span
                            className="size-10 shrink-0 rounded-xl"
                            style={{ background: fav.coverGradient }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--story-ink)]">
                              {fav.title}
                            </p>
                            <p className="truncate text-xs text-[var(--story-muted)]">
                              {fav.genre} · with {fav.characterName}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-[var(--story-ink)]">Your stories</h2>
                {progress.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--story-line)] bg-white/70 px-4 py-6 text-center text-sm text-[var(--story-muted)]">
                    No stories saved yet.{" "}
                    <Link href="/" className="font-medium text-[var(--story-accent)] underline-offset-2 hover:underline">
                      Choose one to start
                    </Link>
                    .
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {progress.map((item) => (
                      <li key={item.storyId}>
                        <Link
                          href={`/story/${item.storyId}`}
                          className="block rounded-2xl border border-[var(--story-line)] bg-white px-4 py-3 shadow-sm transition active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--story-ink)]">{item.title}</p>
                              <p className="mt-0.5 text-xs text-[var(--story-muted)]">
                                as {item.playerName} · with {item.characterName}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                item.status === "completed"
                                  ? "bg-[var(--story-accent-soft)] text-[var(--story-accent)]"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.status === "completed" ? "Done" : "Playing"}
                            </span>
                          </div>
                          <div className="mt-2.5">
                            <div className="mb-1 flex justify-between text-[11px] text-[var(--story-muted)]">
                              <span>Goal</span>
                              <span>{item.goalProgress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--story-bg)]">
                              <div
                                className="h-full rounded-full bg-[var(--story-accent)] transition-all"
                                style={{ width: `${Math.min(100, item.goalProgress)}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="pt-2">
                <LogoutButton />
              </section>
            </>
          )}
        </div>
      </main>
    </StoryShell>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-[var(--story-bg)] px-2 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[var(--story-accent)]">{icon}</div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--story-ink)]">{value}</p>
      <p className="text-[10px] text-[var(--story-muted)]">{label}</p>
    </div>
  )
}
