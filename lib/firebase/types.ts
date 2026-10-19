export type UserProfile = {
  uid: string
  displayName: string
  photoURL: string | null
  email: string | null
  createdAt: string
  updatedAt: string
  storiesStarted: number
  storiesCompleted: number
}

export type CloudStoryProgress = {
  storyId: string
  title: string
  genre: string
  characterName: string
  playerName: string
  characterNames: Record<string, string>
  totals: Record<string, number>
  unlockedMilestones: string[]
  endingId: string | null
  goalProgress: number
  status: "in_progress" | "completed"
  startedAt: string
  updatedAt: string
  recentLedger?: unknown[]
}

export type StoryHype = {
  storyId: string
  starts: number
  comments: number
  likes: number
  updatedAt: string
}

export type StoryComment = {
  id: string
  storyId: string
  uid: string
  authorName: string
  authorPhoto: string | null
  text: string
  createdAt: string
}
