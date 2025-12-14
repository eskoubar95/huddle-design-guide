/**
 * Tests for MatchService
 * Run with: deno test --allow-net --allow-env match-service.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { MatchService } from '../match-service.ts'
import { MetadataRepository } from '../../repositories/metadata-repository.ts'
import { TransfermarktClient } from '../../repositories/transfermarkt-client.ts'

// Mock repositories for unit tests (optional - can be skipped for integration tests)
// For now, we'll create integration tests that use real repositories

Deno.test('MatchService: matchClub - should find existing club', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const matchService = new MatchService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    // Test with FC København (should exist in database)
    const result = await matchService.matchClub('FC København')
    
    assertExists(result.club, 'Should find club')
    assertEquals(result.confidence, 100, 'Should have 100% confidence when found')
    console.log(`✅ Found club: ${result.club.name} (${result.club.id})`)
  } finally {
    await repository.close()
  }
})

Deno.test('MatchService: matchSeason - should parse and find season', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const matchService = new MatchService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    // Test with season "22/23"
    const result = await matchService.matchSeason('22/23')
    
    assertExists(result.season, 'Should find or create season')
    assertEquals(result.confidence, 100, 'Should have 100% confidence')
    console.log(`✅ Found/created season: ${result.season.label} (${result.season.id})`)
  } finally {
    await repository.close()
  }
})

Deno.test('MatchService: matchSeason - should handle tournament format', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const matchService = new MatchService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    // Test with tournament season "2006" (World Cup)
    const result = await matchService.matchSeason('2006')
    
    assertExists(result.season, 'Should find or create season')
    assertEquals(result.season.season_type, 'tournament', 'Should be tournament type')
    console.log(`✅ Found/created tournament season: ${result.season.label} (${result.season.id})`)
  } finally {
    await repository.close()
  }
})

console.log('🧪 Running MatchService tests...\n')

