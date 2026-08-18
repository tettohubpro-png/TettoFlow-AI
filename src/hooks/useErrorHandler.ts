import { useCallback, useState } from 'react'
import { StructuredError, handleError } from '@/services/errorHandler'

/**
 * Hook para gerenciar erros estruturados em componentes
 * Retorna error, loading, execute e reset
 */
export function useErrorHandler() {
  const [error, setError] = useState<StructuredError | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = useCallback(
    async <T,>(fn: () => Promise<T>, onSuccess?: (result: T) => void): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await fn()
        onSuccess?.(result)
        return result
      } catch (err) {
        const structuredError = handleError(err)
        setError(structuredError)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    loading,
    execute,
    reset,
    errorMessage: error?.getUserMessage() ?? null,
    canRetry: error?.context.canRetry ?? false,
  }
}
