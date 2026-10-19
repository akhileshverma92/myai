"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

export type FirebaseClients = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

function readConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !appId) return null

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }
}

export function isFirebaseConfigured(): boolean {
  return readConfig() != null
}

export function getFirebase(): FirebaseClients | null {
  const config = readConfig()
  if (!config) return null

  const app = getApps().length ? getApps()[0]! : initializeApp(config)
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  }
}
