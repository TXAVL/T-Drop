import type { Settings } from './types'

/**
 * The welcome tour's version. Everyone whose saved onboardingVersion is lower sees the tour once on
 * their next launch, updaters included; finishing it (any way out of the window) saves this number.
 * Raise it only when the tour changes enough that everyone should see it again.
 *   1: the tour before 0.4.0 (never saved; those users only have tutorialCompleted)
 *   2: the tour played by the real app (0.4.0)
 */
export const ONBOARDING_VERSION = 2

/**
 * Whether this launch should open the standalone "What's New" feature showcase
 * (separate from the full Welcome Tour): true only for returning users who have
 * already completed onboarding and have not yet seen the current app version.
 */
export function whatsNewDue(
  s: Pick<Settings, 'tutorialCompleted' | 'lastSeenChangelogVersion'>,
  currentVersion: string
): boolean {
  if (!s.tutorialCompleted || !currentVersion) return false
  const seen = (s.lastSeenChangelogVersion || '').replace(/^v/i, '').trim()
  const cur = currentVersion.replace(/^v/i, '').trim()
  return Boolean(cur) && seen !== cur
}

/**
 * Whether this launch should open the welcome tour: 'first-run' for a new install (or a reset
 * tutorial), 'update' for someone who finished an older tour, null when they have seen this one.
 */
export function onboardingDue(s: Pick<Settings, 'tutorialCompleted' | 'onboardingVersion'>): 'first-run' | 'update' | null {
  if ((s.onboardingVersion ?? 0) >= ONBOARDING_VERSION) return null
  return s.tutorialCompleted ? 'update' : 'first-run'
}
