import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Operation, OperationStatus } from '@/types/database'
import { DEFAULT_TEMPLATE_ID } from '@/types/database'

export function useOperations(clientId?: string) {
  const { workspace, user } = useAuth()
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOperations = useCallback(async () => {
    if (!workspace?.id) {
      setOperations([])
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('operations')
      .select('*, clients(name)')
      .eq('workspace_id', workspace.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    setOperations((data ?? []) as Operation[])
    setLoading(false)
  }, [workspace?.id, clientId])

  useEffect(() => {
    fetchOperations()
  }, [fetchOperations])

  const createOperation = async (payload: {
    client_id: string
    title: string
    deadline?: string
  }) => {
    if (!workspace?.id) return { data: null, error: 'Workspace não carregado' }

    const { data, error } = await supabase
      .from('operations')
      .insert({
        workspace_id: workspace.id,
        client_id: payload.client_id,
        template_id: DEFAULT_TEMPLATE_ID,
        title: payload.title,
        status: 'DRAFT' as OperationStatus,
        priority: 'MEDIUM',
        deadline: payload.deadline ?? null,
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (!error) await fetchOperations()
    return { data, error: error?.message ?? null }
  }

  const updateStatus = async (operationId: string, toStatus: OperationStatus) => {
    const { error } = await supabase
      .from('operations')
      .update({ status: toStatus })
      .eq('id', operationId)

    if (!error) await fetchOperations()
    return { error: error?.message ?? null }
  }

  return { operations, loading, fetchOperations, createOperation, updateStatus }
}

/** @deprecated Use useOperations */
export const useProjects = useOperations
