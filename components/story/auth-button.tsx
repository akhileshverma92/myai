"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { onAuthStateChanged, type User } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client"

/** Header auth control — no logout here. Logout lives on the account page. */
export function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const configured = isFirebaseConfigured()

  useEffect(() => {
    const fb = getFirebase()
    if (!fb) {
      setReady(true)
      return
    }
    return onAuthStateChanged(fb.auth, (next) => {
      setUser(next)
      setReady(true)
    })
  }, [])

  if (!configured) {
    return (
      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-[var(--story-muted)] shadow-sm">
        Local save
      </span>
    )
  }

  if (!ready) return null

  if (user) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-9 gap-2 rounded-full bg-white/90 px-2.5 text-xs font-medium text-[var(--story-ink)] shadow-sm hover:bg-white"
      >
        <Link href="/account" aria-label="Open account">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="size-6 rounded-full object-cover" />
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--story-accent-soft)] text-[10px] font-bold text-[var(--story-accent)]">
              {(user.displayName || "P").slice(0, 1)}
            </span>
          )}
          <span className="max-w-[5.5rem] truncate">{user.displayName?.split(" ")[0] || "Account"}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button
      asChild
      size="sm"
      className="h-9 rounded-full bg-[var(--story-accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--story-accent)]/90"
    >
      <Link href="/login">Sign in</Link>
    </Button>
  )
}

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fb = getFirebase()
    if (!fb) return
    return onAuthStateChanged(fb.auth, setUser)
  }, [])

  return user
}
