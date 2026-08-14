import { useCallback, useEffect, useState } from 'react'
import { listAccess, type AccessUser } from '@/services/teamAdmin'

/** Carrega a lista de Controle de acesso só enquanto o painel está aberto. */
export function useAccessControl(open: boolean) {
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await listAccess()
    setUsers(result.users)
    if (result.error) setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  return { users, loading, error, refresh }
}
