"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderOpen, Home, Search, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  {
    href: "/categories",
    label: "Category",
    icon: FolderOpen,
    match: (p: string) => p.startsWith("/categories"),
  },
  {
    href: "/account",
    label: "Profile",
    icon: UserRound,
    match: (p: string) => p.startsWith("/account"),
  },
] as const

export function BottomNav() {
  const pathname = usePathname() || "/"

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--story-line)] bg-white/92 backdrop-blur-xl"
      aria-label="Main"
    >
      <ul className="mx-auto grid h-[3.65rem] max-w-xl grid-cols-4 px-1">
        {ITEMS.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition",
                  active ? "text-[var(--story-accent)]" : "text-[var(--story-muted)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition",
                    active && "bg-[var(--story-accent-soft)]",
                  )}
                >
                  <Icon className={cn("size-[1.15rem]", active && "stroke-[2.25px]")} />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
