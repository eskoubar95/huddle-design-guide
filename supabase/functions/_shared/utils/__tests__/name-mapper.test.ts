/**
 * Unit tests for name-mapper utilities
 * Run with: deno test --allow-net --allow-env name-mapper.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { normalizeClubName } from '../name-mapper.ts'

Deno.test('normalizeClubName: should return mapped name for "fc københavn"', () => {
  const result = normalizeClubName('fc københavn')
  
  assertEquals(result.length, 2)
  assertEquals(result[0], 'fc copenhagen') // Mapped name
  assertEquals(result[1], 'fc københavn') // Original name
})

Deno.test('normalizeClubName: should return original for unmapped club', () => {
  const result = normalizeClubName('Manchester United')
  
  assertEquals(result.length, 1)
  assertEquals(result[0], 'manchester united')
})

Deno.test('normalizeClubName: should handle case-insensitive input', () => {
  const result1 = normalizeClubName('FC KØBENHAVN')
  const result2 = normalizeClubName('fc københavn')
  
  assertEquals(result1[0], 'fc copenhagen')
  assertEquals(result2[0], 'fc copenhagen')
})

Deno.test('normalizeClubName: should trim whitespace', () => {
  const result = normalizeClubName('  fc københavn  ')
  
  assertEquals(result.length, 2)
  assertEquals(result[0], 'fc copenhagen')
})

Deno.test('normalizeClubName: should handle empty string', () => {
  const result = normalizeClubName('')
  
  assertEquals(result.length, 1)
  assertEquals(result[0], '')
})

console.log('🧪 Running name-mapper tests...\n')

