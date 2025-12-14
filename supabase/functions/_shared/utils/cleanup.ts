/**
 * Cleanup manager for Edge Functions
 * Registers cleanup tasks that should be executed on error
 */

export class CleanupManager {
  private tasks: Array<() => Promise<void>> = []

  /**
   * Register a cleanup task
   */
  register(task: () => Promise<void>): void {
    this.tasks.push(task)
  }

  /**
   * Execute all registered cleanup tasks
   */
  async execute(): Promise<void> {
    const errors: Error[] = []

    for (const task of this.tasks) {
      try {
        await task()
      } catch (error) {
        console.error('[CLEANUP] Cleanup task failed:', error)
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (errors.length > 0) {
      console.warn(`[CLEANUP] ${errors.length} cleanup task(s) failed`)
    }
  }

  /**
   * Clear all registered tasks (call on success)
   */
  clear(): void {
    this.tasks = []
  }
}

