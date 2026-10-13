import { describe, it, expect } from 'vitest'
import { trimMemory, scheduleRetractMemoryTrim, cancelScheduledMemoryTrim } from '../electron/main/memory'

describe('Memory Optimization Suite', () => {
  it('trimMemory executes safely without throwing', () => {
    const res = trimMemory([])
    expect(res).toBeDefined()
    expect(typeof res.ok).toBe('boolean')
    expect(typeof res.mainRssMb).toBe('number')
  })

  it('scheduleRetractMemoryTrim schedules and cancelScheduledMemoryTrim cancels without errors', () => {
    scheduleRetractMemoryTrim(() => [])
    scheduleRetractMemoryTrim([])
    expect(() => cancelScheduledMemoryTrim()).not.toThrow()
  })
})
