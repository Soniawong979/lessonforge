import type {
  OutlineSlide,
  StoredOutlineDraft,
} from '../types/outline'

const STORAGE_KEY = 'lessonforge:outline-draft'

export type DraftLoadResult =
  | { status: 'missing' }
  | { status: 'valid'; draft: StoredOutlineDraft }
  | { status: 'invalid' }
  | { status: 'unavailable' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOutlineSlide(value: unknown): value is OutlineSlide {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    Array.isArray(value.bullets) &&
    value.bullets.every((bullet) => typeof bullet === 'string') &&
    Array.isArray(value.sourcePageNumbers) &&
    value.sourcePageNumbers.every(
      (pageNumber) =>
        typeof pageNumber === 'number' &&
        Number.isInteger(pageNumber) &&
        pageNumber > 0,
    )
  )
}

function isStoredOutlineDraft(value: unknown): value is StoredOutlineDraft {
  if (!isRecord(value)) {
    return false
  }

  if (
    value.version !== 1 ||
    (typeof value.sourcePdfName !== 'string' &&
      value.sourcePdfName !== null) ||
    typeof value.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !Array.isArray(value.slides) ||
    !value.slides.every(isOutlineSlide)
  ) {
    return false
  }

  const slideIds = value.slides.map((slide) => slide.id)
  return new Set(slideIds).size === slideIds.length
}

export function loadOutlineDraft(): DraftLoadResult {
  let serialized: string | null

  try {
    serialized = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }

  if (serialized === null) {
    return { status: 'missing' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    return { status: 'invalid' }
  }

  return isStoredOutlineDraft(parsed)
    ? { status: 'valid', draft: parsed }
    : { status: 'invalid' }
}

export function saveOutlineDraft(
  draft: Pick<StoredOutlineDraft, 'sourcePdfName' | 'slides'>,
): StoredOutlineDraft {
  const storedDraft: StoredOutlineDraft = {
    version: 1,
    sourcePdfName: draft.sourcePdfName,
    updatedAt: new Date().toISOString(),
    slides: draft.slides,
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedDraft))
  return storedDraft
}

export function deleteOutlineDraft(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
