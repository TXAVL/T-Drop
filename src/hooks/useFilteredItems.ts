/**
 * useFilteredItems — derives the visible, grouped item list from raw state.
 *
 * Split into Pinned (favorites) and Recent (everything else), then apply the
 * search query. Kept as a selector so components stay presentational.
 */
import { useDeferredValue, useMemo } from 'react'
import { useStore } from '../store/appStore'
import type { ClipboardItemDto, TypeFilter } from '../../shared/types'
import { basename, isImagePath } from '../lib/format'
import { parseColor } from '../lib/colorUtils'

function normalizeSearchText(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0110\u0111]/g, 'd')
}

function matches(it: ClipboardItemDto, q: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const needleNorm = normalizeSearchText(needle)

  // 1. Search in item note if present
  if (it.note) {
    const noteLower = it.note.toLowerCase()
    if (noteLower.includes(needle) || normalizeSearchText(noteLower).includes(needleNorm)) {
      return true
    }
  }

  // 2. Search in item content
  switch (it.data.kind) {
    case 'text': {
      const textLower = it.data.text.toLowerCase()
      return textLower.includes(needle) || normalizeSearchText(textLower).includes(needleNorm)
    }
    case 'files':
      return (
        it.data.paths.some((p) => {
          const name = basename(p).toLowerCase()
          return name.includes(needle) || normalizeSearchText(name).includes(needleNorm)
        }) ||
        (it.data.entries?.some((en) => {
          const name = en.name.toLowerCase()
          return name.includes(needle) || normalizeSearchText(name).includes(needleNorm)
        }) ?? false)
      )
    case 'image':
      if (it.data.fileName) {
        const fn = it.data.fileName.toLowerCase()
        if (fn.includes(needle) || normalizeSearchText(fn).includes(needleNorm)) return true
      }
      return false
    case 'image-collection':
      return it.data.images.some((img) => {
        if (!img.fileName) return false
        const fn = img.fileName.toLowerCase()
        return fn.includes(needle) || normalizeSearchText(fn).includes(needleNorm)
      })
  }
}

/**
 * Explorer-copied photos are stored as `files` but belong in Images, not Files.
 * Mixed stacks (photo + PDF) stay in Files only.
 */
export function isImageOnlyFileItem(it: ClipboardItemDto): boolean {
  if (it.data.kind !== 'files') return false
  const paths = it.data.paths
  if (paths.length === 0) return false
  if (it.data.entries?.some((en) => en.isDirectory)) return false
  return paths.every((p) => isImagePath(p))
}

export function itemMatchesTypeFilter(it: ClipboardItemDto, filter: TypeFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'pinned') return !!it.pinned
  switch (filter) {
    case 'text':
      return it.data.kind === 'text' && !it.data.isUrl && !it.data.isColor && !parseColor(it.data.text)
    case 'links':
      return it.data.kind === 'text' && !!it.data.isUrl
    case 'images':
      if (it.data.kind === 'image' || it.data.kind === 'image-collection') return true
      return isImageOnlyFileItem(it)
    case 'files':
      return it.data.kind === 'files' && !isImageOnlyFileItem(it)
    case 'colors':
      return it.data.kind === 'text' && (!!it.data.isColor || !!parseColor(it.data.text))
  }
}

export interface GroupedItems {
  pinned: ClipboardItemDto[]
  recent: ClipboardItemDto[]
}

export function useFilteredItems(): GroupedItems {
  const items = useStore((s) => s.items)
  // Deferred so typing in search stays responsive: the input updates at
  // once, the (possibly long) filtered list catches up at lower priority.
  const query = useDeferredValue(useStore((s) => s.query))
  const typeFilter = useStore((s) => s.typeFilter)
  const tutorialStep = useStore((s) => s.tutorialStep)

  return useMemo(() => {
    const pinned: ClipboardItemDto[] = []
    const recent: ClipboardItemDto[] = []

    const filteredByTutorial = items.filter((it) => {
      if (tutorialStep <= 0) return true
      switch (tutorialStep) {
        case 1:
          return it.id === 'onboarding-welcome'
        case 2:
          return false
        case 3:
          return it.id === 'onboarding-image' || !it.id.startsWith('onboarding-')
        case 4:
          return it.id === 'onboarding-files'
        case 5:
          return true
        default:
          return true
      }
    })

    const q = query.trim()
    for (const it of filteredByTutorial) {
      if (!matches(it, q)) continue
      if (!itemMatchesTypeFilter(it, typeFilter)) continue
      ;(it.pinned ? pinned : recent).push(it)
    }
    return { pinned, recent }
  }, [items, query, typeFilter, tutorialStep])
}
