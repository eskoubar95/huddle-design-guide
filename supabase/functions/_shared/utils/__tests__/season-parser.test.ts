/**
 * Unit tests for season-parser utilities
 * Run with: deno test --allow-net --allow-env season-parser.test.ts
 */

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { parseSeasonInput, normalizeSeasonLabel, type ParsedSeason } from '../season-parser.ts'

Deno.test('parseSeasonInput: should parse league season "23/24"', () => {
  const result = parseSeasonInput('23/24')
  
  assertEquals(result.startYear, 2023)
  assertEquals(result.endYear, 2024)
  assertEquals(result.label, '23/24')
  assertEquals(result.tmSeasonId, '2023')
  assertEquals(result.seasonType, 'league')
})

Deno.test('parseSeasonInput: should parse tournament season "2006"', () => {
  const result = parseSeasonInput('2006')
  
  assertEquals(result.startYear, 2006)
  assertEquals(result.endYear, 2006)
  assertEquals(result.label, '2006')
  assertEquals(result.tmSeasonId, '2006')
  assertEquals(result.seasonType, 'tournament')
})

Deno.test('parseSeasonInput: should parse calendar season "2023"', () => {
  const result = parseSeasonInput('2023')
  
  assertEquals(result.startYear, 2023)
  assertEquals(result.endYear, 2023)
  assertEquals(result.label, '2023')
  assertEquals(result.tmSeasonId, '2023')
  assertEquals(result.seasonType, 'calendar')
})

Deno.test('parseSeasonInput: should parse full range "2023/2024"', () => {
  const result = parseSeasonInput('2023/2024')
  
  assertEquals(result.startYear, 2023)
  assertEquals(result.endYear, 2024)
  assertEquals(result.label, '23/24')
  assertEquals(result.tmSeasonId, '2023')
  assertEquals(result.seasonType, 'league')
})

Deno.test('parseSeasonInput: should parse single digit "23"', () => {
  const result = parseSeasonInput('23')
  
  assertEquals(result.startYear, 2023)
  assertEquals(result.endYear, 2023)
  assertEquals(result.label, '23')
  assertEquals(result.tmSeasonId, '2023')
  assertEquals(result.seasonType, 'calendar')
})

Deno.test('parseSeasonInput: should throw on invalid format', () => {
  assertThrows(
    () => parseSeasonInput('invalid'),
    Error,
    'Invalid season format'
  )
})

Deno.test('parseSeasonInput: should handle edge case "99/00"', () => {
  const result = parseSeasonInput('99/00')
  
  assertEquals(result.startYear, 2099)
  assertEquals(result.endYear, 2100)
  assertEquals(result.label, '99/00')
  assertEquals(result.tmSeasonId, '2099')
  assertEquals(result.seasonType, 'league')
})

Deno.test('normalizeSeasonLabel: should normalize league season', () => {
  const parsed: ParsedSeason = {
    startYear: 2023,
    endYear: 2024,
    label: '23/24',
    tmSeasonId: '2023',
    seasonType: 'league'
  }
  
  const normalized = normalizeSeasonLabel(parsed)
  assertEquals(normalized, '23/24')
})

Deno.test('normalizeSeasonLabel: should normalize tournament season', () => {
  const parsed: ParsedSeason = {
    startYear: 2006,
    endYear: 2006,
    label: '2006',
    tmSeasonId: '2006',
    seasonType: 'tournament'
  }
  
  const normalized = normalizeSeasonLabel(parsed)
  assertEquals(normalized, '2006')
})

Deno.test('normalizeSeasonLabel: should normalize calendar season', () => {
  const parsed: ParsedSeason = {
    startYear: 2023,
    endYear: 2023,
    label: '2023',
    tmSeasonId: '2023',
    seasonType: 'calendar'
  }
  
  const normalized = normalizeSeasonLabel(parsed)
  assertEquals(normalized, '2023')
})

console.log('🧪 Running season-parser tests...\n')

