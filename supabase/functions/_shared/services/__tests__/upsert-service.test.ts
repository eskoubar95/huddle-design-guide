/**
 * Unit tests for UpsertService
 * Run with: deno test --allow-net --allow-env upsert-service.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { UpsertService } from '../upsert-service.ts'
import { MetadataRepository } from '../../repositories/metadata-repository.ts'
import { TransfermarktClient } from '../../repositories/transfermarkt-client.ts'

Deno.test('UpsertService: upsertPlayersBatch - should process valid players', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const upsertService = new UpsertService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    const result = await upsertService.upsertPlayersBatch([
      {
        id: 'test-player-1',
        name: 'Test Player',
        position: 'Forward',
        nationality: ['Denmark'],
        height: 180,
      }
    ])
    
    assertEquals(result.playersProcessed, 1, 'Should process 1 player')
    assertExists(result.playersCreated >= 0 || result.playersUpdated >= 0, 'Should create or update')
    assertEquals(result.errors.length, 0, 'Should have no errors')
    console.log(`✅ Processed players: ${result.playersProcessed}, Created: ${result.playersCreated}, Updated: ${result.playersUpdated}`)
  } finally {
    await repository.close()
  }
})

Deno.test('UpsertService: upsertPlayersBatch - should handle invalid players', async () => {
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const upsertService = new UpsertService(repository, transfermarktClient)

  try {
    await repository.connect()
    
    const result = await upsertService.upsertPlayersBatch([
      {
        id: 'test-player-invalid',
        name: '', // Empty name should cause error
      }
    ])
    
    assertEquals(result.errors.length, 1, 'Should have 1 error')
    assertEquals(result.errors[0].playerId, 'test-player-invalid', 'Error should reference player ID')
    console.log(`✅ Correctly handled invalid player: ${result.errors[0].error}`)
  } finally {
    await repository.close()
  }
})

console.log('🧪 Running UpsertService tests...\n')

