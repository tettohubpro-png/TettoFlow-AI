import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { FinancialEntry, FinancialEntryStatus } from '@/types/database'

/** Lançamentos financeiros do workspace (Financeiro) — entradas geradas por
 * contrato de cliente + qualquer outro lançamento manual (ex. pagamento de
 * equipe). Restrito a OWNER/ADMIN/MANAGER via RLS. */
export function useFinancialEntries() {
  const { workspace, user } = useAuth()
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!workspace?.id) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('financial_entries')
      .select('*, clients(name)')
      .eq('workspace_id', workspace.id)
      .order('due_date', { ascending: true })

    if (err) setError(err.message)
    else {
      setEntries((data ?? []) as FinancialEntry[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const createEntry = async (payload: {
    type: 'income' | 'expense'
    category?: string
    description: string
    amount: number
    due_date: string
    client_id?: string
  }) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }

    const { error: err } = await supabase.from('financial_entries').insert({
      workspace_id: workspace.id,
      client_id: payload.client_id || null,
      type: payload.type,
      category: payload.category || 'other',
      description: payload.description,
      amount: payload.amount,
      due_date: payload.due_date,
      status: 'pending',
      created_by: user?.id ?? null,
    })

    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  const updateStatus = async (id: string, status: FinancialEntryStatus) => {
    const { error: err } = await supabase
      .from('financial_entries')
      .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
      .eq('id', id)
    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  const updateEntry = async (
    id: string,
    patch: Partial<Pick<FinancialEntry, 'description' | 'amount' | 'due_date' | 'category' | 'type'>>,
  ) => {
    const { error: err } = await supabase
      .from('financial_entries')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  return { entries, loading, error, refresh: fetchEntries, createEntry, updateStatus, updateEntry }
}
