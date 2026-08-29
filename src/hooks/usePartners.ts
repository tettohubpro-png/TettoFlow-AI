import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Client, ClientContract } from '@/types/database'

export interface PartnerWithContracts extends Client {
  client_contracts: ClientContract[]
}

/** Clientes marcados como parceiro (permuta/sem contrato monetário) —
 * separados dos clientes pagantes pra não distorcer o faturamento. */
export function usePartners() {
  const { workspace } = useAuth()
  const [partners, setPartners] = useState<PartnerWithContracts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPartners = useCallback(async () => {
    if (!workspace?.id) {
      setPartners([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*, client_contracts(*)')
      .eq('workspace_id', workspace.id)
      .eq('client_type', 'PARTNER')
      .is('archived_at', null)
      .order('name')

    if (err) setError(err.message)
    else {
      setPartners((data ?? []) as PartnerWithContracts[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  return { partners, loading, error, fetchPartners }
}
