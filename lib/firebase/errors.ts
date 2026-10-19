export function mapFirebaseError(error: unknown, fallback = "Something went wrong."): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : ""
  const message = error instanceof Error ? error.message : String(error ?? "")

  if (
    code === "permission-denied" ||
    /missing or insufficient permissions/i.test(message)
  ) {
    return "Firestore blocked this write. Open Firebase Console → Firestore → Rules, paste the project’s firestore.rules file, then click Publish. Also make sure you are signed in."
  }
  if (code === "unauthenticated" || /auth/i.test(code)) {
    return "Please sign in again, then retry."
  }
  if (code === "failed-precondition" && /index/i.test(message)) {
    return "Firestore needs an index for this query. Check the browser console for a create-index link."
  }
  return message || fallback
}
