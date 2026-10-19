"use client"

import type { StorySession } from "@/lib/stories/types"

const DB_NAME = "story-chat"
const DB_VERSION = 1
const STORE = "sessions"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("storyId", "storyId", { unique: false })
        store.createIndex("updatedAt", "updatedAt", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function saveSession(session: StorySession): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).put(session)
  await txDone(tx)
  db.close()
}

export async function getSession(sessionId: string): Promise<StorySession | null> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readonly")
  const req = tx.objectStore(STORE).get(sessionId)
  const result = await new Promise<StorySession | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as StorySession | undefined)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return result ?? null
}

export async function getLatestSessionForStory(storyId: string): Promise<StorySession | null> {
  const all = await listSessions()
  const matches = all.filter((s) => s.storyId === storyId)
  matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return matches[0] ?? null
}

export async function listSessions(): Promise<StorySession[]> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readonly")
  const req = tx.objectStore(STORE).getAll()
  const result = await new Promise<StorySession[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as StorySession[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return result
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).delete(sessionId)
  await txDone(tx)
  db.close()
}
