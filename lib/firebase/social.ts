"use client"

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  setDoc,
} from "firebase/firestore"
import { getFirebase } from "@/lib/firebase/client"
import { mapFirebaseError } from "@/lib/firebase/errors"
import type { StoryComment, StoryHype } from "@/lib/firebase/types"

const emptyHype = (storyId: string): StoryHype => ({
  storyId,
  starts: 0,
  comments: 0,
  likes: 0,
  updatedAt: new Date().toISOString(),
})

export async function getStoryHype(storyId: string): Promise<StoryHype> {
  const fb = getFirebase()
  if (!fb) return emptyHype(storyId)
  try {
    const snap = await getDoc(doc(fb.db, "storyStats", storyId))
    if (!snap.exists()) return emptyHype(storyId)
    return { ...emptyHype(storyId), ...(snap.data() as Partial<StoryHype>) }
  } catch {
    return emptyHype(storyId)
  }
}

export async function getAllStoryHype(): Promise<Record<string, StoryHype>> {
  const fb = getFirebase()
  if (!fb) return {}
  try {
    const snap = await getDocs(collection(fb.db, "storyStats"))
    const out: Record<string, StoryHype> = {}
    snap.forEach((d) => {
      const data = d.data() as Partial<StoryHype>
      out[d.id] = { ...emptyHype(d.id), ...data, storyId: d.id }
    })
    return out
  } catch {
    return {}
  }
}

async function ensureStats(storyId: string) {
  const fb = getFirebase()
  if (!fb) return
  const ref = doc(fb.db, "storyStats", storyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, emptyHype(storyId))
  }
}

export async function likeStory(storyId: string, uid: string): Promise<void> {
  const fb = getFirebase()
  if (!fb) throw new Error("Sign in to hype a story.")

  try {
    await ensureStats(storyId)
    const likeRef = doc(fb.db, "storyStats", storyId, "likes", uid)
    const existing = await getDoc(likeRef)
    if (existing.exists()) return

    await setDoc(likeRef, { uid, createdAt: new Date().toISOString() })
    await setDoc(
      doc(fb.db, "storyStats", storyId),
      { storyId, likes: increment(1), updatedAt: new Date().toISOString() },
      { merge: true },
    )
  } catch (error) {
    throw new Error(mapFirebaseError(error, "Could not hype story."))
  }
}

export async function listStoryComments(storyId: string, max = 40): Promise<StoryComment[]> {
  const fb = getFirebase()
  if (!fb) return []

  try {
    // No orderBy — avoids index setup; sort client-side
    const snap = await getDocs(collection(fb.db, "storyStats", storyId, "comments"))
    const list = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        storyId,
        uid: String(data.uid ?? ""),
        authorName: String(data.authorName ?? "Player"),
        authorPhoto: (data.authorPhoto as string | null) ?? null,
        text: String(data.text ?? ""),
        createdAt:
          typeof data.createdAt === "string"
            ? data.createdAt
            : data.createdAt?.toDate?.()?.toISOString?.() || new Date(0).toISOString(),
      } satisfies StoryComment
    })
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list.slice(0, max)
  } catch (error) {
    throw new Error(mapFirebaseError(error, "Could not load tips."))
  }
}

export async function addStoryComment(args: {
  storyId: string
  uid: string
  authorName: string
  authorPhoto?: string | null
  text: string
}): Promise<StoryComment> {
  const fb = getFirebase()
  if (!fb) throw new Error("Sign in to comment.")

  const text = args.text.trim().slice(0, 500)
  if (text.length < 2) throw new Error("Comment is too short.")

  try {
    await ensureStats(args.storyId)

    const createdAt = new Date().toISOString()
    // Keep payload aligned with firestore.rules required keys
    const payload = {
      uid: args.uid,
      authorName: args.authorName || "Player",
      authorPhoto: args.authorPhoto ?? null,
      text,
      createdAt,
    }

    const docRef = await addDoc(collection(fb.db, "storyStats", args.storyId, "comments"), payload)

    await setDoc(
      doc(fb.db, "storyStats", args.storyId),
      {
        storyId: args.storyId,
        comments: increment(1),
        updatedAt: createdAt,
      },
      { merge: true },
    )

    return {
      id: docRef.id,
      storyId: args.storyId,
      ...payload,
    }
  } catch (error) {
    throw new Error(mapFirebaseError(error, "Could not post tip."))
  }
}
