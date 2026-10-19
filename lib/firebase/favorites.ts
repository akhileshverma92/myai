"use client"

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { getFirebase } from "@/lib/firebase/client"

export type FavoriteStory = {
  storyId: string
  title: string
  genre: string
  characterName: string
  coverGradient: string
  accent: string
  savedAt: string
}

export async function isStoryFavorited(uid: string, storyId: string): Promise<boolean> {
  const fb = getFirebase()
  if (!fb) return false
  const snap = await getDoc(doc(fb.db, "users", uid, "favorites", storyId))
  return snap.exists()
}

export async function listFavorites(uid: string): Promise<FavoriteStory[]> {
  const fb = getFirebase()
  if (!fb) return []
  const snap = await getDocs(collection(fb.db, "users", uid, "favorites"))
  const items = snap.docs.map((d) => d.data() as FavoriteStory)
  items.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  return items
}

export async function addFavorite(uid: string, story: Omit<FavoriteStory, "savedAt">): Promise<void> {
  const fb = getFirebase()
  if (!fb) throw new Error("Sign in to save favorites.")
  await setDoc(doc(fb.db, "users", uid, "favorites", story.storyId), {
    ...story,
    savedAt: new Date().toISOString(),
  })
}

export async function removeFavorite(uid: string, storyId: string): Promise<void> {
  const fb = getFirebase()
  if (!fb) throw new Error("Sign in to update favorites.")
  await deleteDoc(doc(fb.db, "users", uid, "favorites", storyId))
}
