/**
 * Unit tests for country-mapper utilities
 * Run with: deno test --allow-net --allow-env country-mapper.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { mapCountryToIso2 } from '../country-mapper.ts'

Deno.test('mapCountryToIso2: should map "Denmark" to "dk"', () => {
  const result = mapCountryToIso2('Denmark')
  assertEquals(result, 'dk')
})

Deno.test('mapCountryToIso2: should map "Germany" to "de"', () => {
  const result = mapCountryToIso2('Germany')
  assertEquals(result, 'de')
})

Deno.test('mapCountryToIso2: should map "England" to "gb"', () => {
  const result = mapCountryToIso2('England')
  assertEquals(result, 'gb')
})

Deno.test('mapCountryToIso2: should map "United Kingdom" to "gb"', () => {
  const result = mapCountryToIso2('United Kingdom')
  assertEquals(result, 'gb')
})

Deno.test('mapCountryToIso2: should handle case-insensitive input', () => {
  assertEquals(mapCountryToIso2('DENMARK'), 'dk')
  assertEquals(mapCountryToIso2('denmark'), 'dk')
  assertEquals(mapCountryToIso2('Denmark'), 'dk')
})

Deno.test('mapCountryToIso2: should handle whitespace', () => {
  assertEquals(mapCountryToIso2('  Denmark  '), 'dk')
  assertEquals(mapCountryToIso2('South Korea'), 'kr')
})

Deno.test('mapCountryToIso2: should return null for unknown country', () => {
  const result = mapCountryToIso2('UnknownCountry')
  assertEquals(result, null)
})

Deno.test('mapCountryToIso2: should return null for null input', () => {
  const result = mapCountryToIso2(null)
  assertEquals(result, null)
})

Deno.test('mapCountryToIso2: should return null for undefined input', () => {
  const result = mapCountryToIso2(undefined)
  assertEquals(result, null)
})

Deno.test('mapCountryToIso2: should handle partial matches', () => {
  // "Germany (Germany)" should match "germany"
  const result = mapCountryToIso2('Germany (Germany)')
  assertEquals(result, 'de')
})

console.log('🧪 Running country-mapper tests...\n')

