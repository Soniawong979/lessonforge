export type OutlineSlide = {
  id: string
  title: string
  bullets: string[]
  sourcePageNumbers: number[]
}

export type OutlineDraftContent = {
  sourcePdfName: string | null
  slides: OutlineSlide[]
}

export type StoredOutlineDraft = OutlineDraftContent & {
  version: 1
  updatedAt: string
}
