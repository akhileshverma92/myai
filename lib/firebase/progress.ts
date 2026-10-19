"use client"

import { doc, getDoc, increment, setDoc } from "firebase/firestore"
import { getFirebase } from "@/lib/firebase/client"
import type { CloudStoryProgress } from "@/lib/firebase/types"
import type { StoryProgressState } from "@/lib/stories/types"

export type SyncProgressInput = {
  uid: string
  progress: StoryProgressState
  meta: {
    title: string
    genre: string
    characterName: string
    playerName: string
    characterNames: Record<string, string>
    startedAt?: string
    isNewStart?: boolean
  }
}

/** Sync progress to the signed-in account. Chat history stays in IndexedDB. */
export async function syncProgressToCloud(input: SyncProgressInput): Promise<void> {
  const fb = getFirebase()
  if (!fb) return

  const { uid, progress, meta } = input
  const status: CloudStoryProgress["status"] = progress.endingId ? "completed" : "in_progress"
  const now = progress.updatedAt || new Date().toISOString()
  const progressRef = doc(fb.db, "users", uid, "progress", progress.storyId)
  const existing = await getDoc(progressRef)
  const wasCompleted = existing.exists() && (existing.data() as CloudStoryProgress).status === "completed"
  const isFirstSave = !existing.exists()

  const payload: CloudStoryProgress = {
    storyId: progress.storyId,
    title: meta.title,
    genre: meta.genre,
    characterName: meta.characterName,
    playerName: meta.playerName,
    characterNames: meta.characterNames,
    totals: progress.totals,
    unlockedMilestones: progress.unlockedMilestones,
    endingId: progress.endingId,
    goalProgress: progress.goalProgress,
    status,
    startedAt: (existing.data() as CloudStoryProgress | undefined)?.startedAt || meta.startedAt || now,
    updatedAt: now,
    recentLedger: progress.ledger.slice(-20),
  }

  await setDoc(progressRef, payload, { merge: true })

  const userRef = doc(fb.db, "users", uid)
  const userUpdates: Record<string, unknown> = { updatedAt: now }
  if (isFirstSave || meta.isNewStart) {
    userUpdates.storiesStarted = increment(1)
  }
  if (status === "completed" && !wasCompleted) {
    userUpdates.storiesCompleted = increment(1)
  }
  await setDoc(userRef, userUpdates, { merge: true })

  if (isFirstSave || meta.isNewStart) {
    const hypeRef = doc(fb.db, "storyStats", progress.storyId)
    await setDoc(
      hypeRef,
      {
        storyId: progress.storyId,
        starts: increment(1),
        updatedAt: now,
      },
      { merge: true },
    )
  }
}

export async function loadProgressFromCloud(
  uid: string,
  storyId: string,
): Promise<CloudStoryProgress | null> {
  const fb = getFirebase()
  if (!fb) return null

  const ref = doc(fb.db, "users", uid, "progress", storyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as CloudStoryProgress
}
