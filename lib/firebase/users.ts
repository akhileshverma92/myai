"use client"

import type { User } from "firebase/auth"
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore"
import { getFirebase } from "@/lib/firebase/client"
import type { CloudStoryProgress, UserProfile } from "@/lib/firebase/types"
import {
  isStoryLanguage,
  loadPreferredLanguage,
  savePreferredLanguage,
  type StoryLanguage,
} from "@/lib/stories/language"

function normalizePreferredLanguage(value: unknown): StoryLanguage | null {
  return isStoryLanguage(value) ? value : null
}

export async function ensureUserProfile(user: User): Promise<UserProfile | null> {
  const fb = getFirebase()
  if (!fb) return null

  const ref = doc(fb.db, "users", user.uid)
  const snap = await getDoc(ref)
  const now = new Date().toISOString()
  const localLang = loadPreferredLanguage()

  if (snap.exists()) {
    const data = snap.data() as UserProfile
    const preferredLanguage =
      normalizePreferredLanguage(data.preferredLanguage) ?? localLang
    const next: UserProfile = {
      ...data,
      displayName: user.displayName || data.displayName || "Player",
      photoURL: user.photoURL ?? data.photoURL,
      email: user.email ?? data.email,
      preferredLanguage,
      updatedAt: now,
    }
    await setDoc(ref, next, { merge: true })
    if (preferredLanguage) savePreferredLanguage(preferredLanguage)
    return next
  }

  const created: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || "Player",
    photoURL: user.photoURL,
    email: user.email,
    preferredLanguage: localLang,
    createdAt: now,
    updatedAt: now,
    storiesStarted: 0,
    storiesCompleted: 0,
  }
  await setDoc(ref, created)
  return created
}

export async function updatePreferredLanguage(
  uid: string,
  language: StoryLanguage,
): Promise<void> {
  savePreferredLanguage(language)
  const fb = getFirebase()
  if (!fb) return
  const now = new Date().toISOString()
  await setDoc(
    doc(fb.db, "users", uid),
    { preferredLanguage: language, updatedAt: now },
    { merge: true },
  )
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const fb = getFirebase()
  if (!fb) return null
  const snap = await getDoc(doc(fb.db, "users", uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function listUserStoryProgress(uid: string): Promise<CloudStoryProgress[]> {
  const fb = getFirebase()
  if (!fb) return []

  const q = query(collection(fb.db, "users", uid, "progress"), orderBy("updatedAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as CloudStoryProgress)
}
