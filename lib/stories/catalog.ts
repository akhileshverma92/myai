import { afterTheLastLecture } from "@/lib/stories/data/after-the-last-lecture"
import { girlInMyBranch } from "@/lib/stories/data/girl-in-my-branch"
import { harborLights } from "@/lib/stories/data/harbor-lights"
import { signalStatic } from "@/lib/stories/data/signal-static"
import { glassGreenhouse } from "@/lib/stories/data/glass-greenhouse"
import { nightBus } from "@/lib/stories/data/night-bus"
import { inkArchive } from "@/lib/stories/data/ink-archive"
import { storyDefinitionSchema, type StoryCatalogItem, type StoryDefinition } from "@/lib/stories/types"

const STORIES: StoryDefinition[] = [
  afterTheLastLecture,
  girlInMyBranch,
  harborLights,
  signalStatic,
  glassGreenhouse,
  nightBus,
  inkArchive,
].map((s) => storyDefinitionSchema.parse(s))

const byId = new Map(STORIES.map((s) => [s.id, s]))

export function listStories(): StoryDefinition[] {
  return STORIES
}

export function getStoryById(id: string): StoryDefinition | undefined {
  return byId.get(id)
}

export function toCatalogItem(story: StoryDefinition): StoryCatalogItem {
  return {
    id: story.id,
    title: story.title,
    tagline: story.tagline,
    premise: story.premise,
    genre: story.genre,
    coverGradient: story.coverGradient,
    accent: story.accent,
    estimatedMinutes: story.estimatedMinutes,
    character: story.character,
    finalGoal: story.finalGoal,
  }
}

export function listCatalog(): StoryCatalogItem[] {
  return STORIES.map(toCatalogItem)
}

/** Public detail without hidden system prompt */
export function getPublicStory(id: string) {
  const story = getStoryById(id)
  if (!story) return null
  return {
    ...toCatalogItem(story),
    openingScene: story.openingScene,
    nameSlots: story.nameSlots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      role: slot.role,
      description: slot.description,
      defaultName: slot.defaultName,
      required: slot.required,
    })),
    scoring: {
      categories: story.scoring.categories.map(({ id: catId, label, description, min, max, initial }) => ({
        id: catId,
        label,
        description,
        min,
        max,
        initial,
      })),
      milestones: story.scoring.milestones.map(({ id: mid, label, description }) => ({
        id: mid,
        label,
        description,
      })),
    },
    endings: story.endings.map(({ id: eid, type, title, summary }) => ({
      id: eid,
      type,
      title,
      summary,
    })),
  }
}
