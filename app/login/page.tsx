import { Suspense } from "react"
import { LoginPage } from "@/components/story/login-page"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[var(--story-bg)] text-sm text-[var(--story-muted)]">
          Loading…
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  )
}
