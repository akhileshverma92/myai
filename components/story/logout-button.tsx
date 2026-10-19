"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut } from "firebase/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { getFirebase } from "@/lib/firebase/client"
import { mapFirebaseError } from "@/lib/firebase/errors"

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmLogout() {
    const fb = getFirebase()
    if (!fb) return
    setBusy(true)
    setError(null)
    try {
      await signOut(fb.auth)
      router.replace("/login")
    } catch (e) {
      setError(mapFirebaseError(e, "Could not log out. Try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            disabled={busy}
          >
            <LogOut className="size-4" />
            {busy ? "Logging out…" : "Log out"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[min(92vw,22rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Storylink?</AlertDialogTitle>
            <AlertDialogDescription>
              You can still play stories on this device. Cloud sync, favorites, and tips need you
              signed in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Stay signed in</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmLogout()}
            >
              Yes, log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
