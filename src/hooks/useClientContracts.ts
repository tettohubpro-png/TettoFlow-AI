import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientContract, ContractPeriodicity } from '@/types/database'

export function useClientContracts(clientId: string | undefined) {
  const { workspace, user } = useAuth()
  const [contracts, setContracts] = useState<ClientContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContracts = useCallback(async () => {
    if (!clientId) {
      setContracts([])
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('client_contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setContracts((data ?? []) as ClientContract[])
      setError(null)
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  /** Cria o contrato — se valor/repetições/1ª cobrança forem informados, o
   * banco gera as parcelas em financial_entries automaticamente (trigger). */
  const createContract = async (payload: {
    title: string
    service_description?: string
    monthly_value?: number
    repetitions?: number
    periodicity?: ContractPeriodicity
    payment_method?: string
    start_date?: string
    first_billing_date?: string
    file_url?: string
  }) => {
    if (!clientId || !workspace?.id) return { error: 'Cliente não selecionado' }

    const { error: err } = await supabase.from('client_contracts').insert({
      workspace_id: workspace.id,
      client_id: clientId,
      title: payload.title,
      service_description: payload.service_description || null,
      monthly_value: payload.monthly_value ?? null,
      repetitions: payload.repetitions ?? null,
      periodicity: payload.periodicity ?? 'monthly',
      payment_method: payload.payment_method || null,
      start_date: payload.start_date || null,
      first_billing_date: payload.first_billing_date || null,
      file_url: payload.file_url || null,
      created_by: user?.id ?? null,
    })

    if (!err) await fetchContracts()
    return { error: err?.message ?? null }
  }

  return { contracts, loading, error, refresh: fetchContracts, createContract }
}
