/**
 * Unit tests for SearchService
 * Run with: deno test --allow-net --allow-env search-service.test.ts
 */

import { assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { SearchService } from '../search-service.ts'
import { MetadataRepository } from '../../repositories/metadata-repository.ts'
import { TransfermarktClient } from '../../repositories/transfermarkt-client.ts'

Deno.test('SearchService: searchClubs - should find clubs in database', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const searchService = new SearchService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    const results = await searchService.searchClubs({
      query: 'FC Copenhagen',
      limit: 10
    })
    
    assertExists(results.length > 0, 'Should find at least one club')
    console.log(`✅ Found ${results.length} clubs matching "FC Copenhagen"`)
  } finally {
    await repository.close()
  }
})

Deno.test('SearchService: searchSeasons - should find seasons', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const searchService = new SearchService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    const results = await searchService.searchSeasons({
      query: '23/24',
      limit: 10
    })
    
    assertExists(results.length > 0, 'Should find at least one season')
    console.log(`✅ Found ${results.length} seasons matching "23/24"`)
  } finally {
    await repository.close()
  }
})

console.log('🧪 Running SearchService tests...\n')

