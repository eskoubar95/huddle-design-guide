/**
 * Shared error handling utilities for Supabase Edge Functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

/**
 * Standardized Edge Function error class
 */
export class EdgeFunctionError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'EdgeFunctionError'
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: {
          code: this.code,
          message: this.message,
        },
      }),
      {
        status: this.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Predefined error types
 */
export const Errors = {
  MISSING_TOKEN: new EdgeFunctionError('MISSING_TOKEN', 'Missing authentication token', 401),
  INVALID_TOKEN: new EdgeFunctionError('INVALID_TOKEN', 'Invalid or expired token', 401),
  USER_MISMATCH: new EdgeFunctionError('USER_MISMATCH', 'User ID mismatch', 403),
  MISSING_FIELDS: (fields: string[]) =>
    new EdgeFunctionError(
      'MISSING_FIELDS',
      `Missing required fields: ${fields.join(', ')}`,
      400
    ),
  JERSEY_NOT_FOUND: new EdgeFunctionError('JERSEY_NOT_FOUND', 'Jersey not found', 404),
  IMAGE_NOT_FOUND: new EdgeFunctionError('IMAGE_NOT_FOUND', 'Image not found', 404),
  INVALID_FILE_TYPE: (allowedTypes: string[]) =>
    new EdgeFunctionError(
      'INVALID_FILE_TYPE',
      `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      400
    ),
  FILE_TOO_LARGE: (maxSize: number) =>
    new EdgeFunctionError(
      'FILE_TOO_LARGE',
      `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
      400
    ),
  FILE_ALREADY_EXISTS: new EdgeFunctionError('FILE_ALREADY_EXISTS', 'File already exists', 409),
  STORAGE_QUOTA_EXCEEDED: new EdgeFunctionError(
    'STORAGE_QUOTA_EXCEEDED',
    'Storage quota exceeded',
    507
  ),
  PROCESSING_FAILED: (operation: string, details: string) =>
    new EdgeFunctionError('PROCESSING_FAILED', `Failed to ${operation}: ${details}`, 500),
}

/**
 * Handle unexpected errors in Edge Functions
 */
export function handleEdgeFunctionError(error: unknown): Response {
  console.error('[EDGE-FUNCTION] Unexpected error:', error)
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: errorMessage,
      },
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

