import type { ReactNode } from "react"
import { BottomNav } from "@/components/story/bottom-nav"
import { cn } from "@/lib/utils"

/** Shared light mobile shell for Storylink screens */
export function StoryShell({
  children,
  className,
  showNav = false,
}: {
  children: ReactNode
  className?: string
  /** Show mobile bottom tab bar (Home / Search / Category / Profile) */
  showNav?: boolean
}) {
  return (
    <div className={cn("story-shell relative flex h-dvh flex-col text-[var(--story-fg)]", className)}>
      <div className="story-shell-bg pointer-events-none absolute inset-0" aria-hidden />
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          showNav && "pb-[calc(3.65rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  )
}
