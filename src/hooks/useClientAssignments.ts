import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientAssignment, Department } from '@/types/database'
import { logProjectActivity } from '@/utils/activityLog'

export function useClientAssignments(clientId?: string) {
  const { workspace, user } = useAuth()
  const [assignments, setAssignments] = useState<ClientAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    if (!workspace?.id) {
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('client_assignments')
      .select('*, users(id, name, email), clients(name)')
      .eq('workspace_id', workspace.id)
      .order('department')

    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    setAssignments((data ?? []) as ClientAssignment[])
    setLoading(false)
  }, [workspace?.id, clientId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const assign = async (
    targetClientId: string,
    targetUserId: string,
    department: Exclude<Department, 'general'>,
  ) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }

    const { error } = await supabase.from('client_assignments').upsert(
      {
        workspace_id: workspace.id,
        client_id: targetClientId,
        user_id: targetUserId,
        department,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,department' },
    )

    if (!error) {
      await logProjectActivity(workspace.id, user?.id ?? null, 'client_assignment', targetClientId, 'assign', {
        user_id: targetUserId,
        department,
      })
      await fetchAssignments()
    }
    return { error: error?.message ?? null }
  }

  const unassign = async (assignmentId: string) => {
    const { error } = await supabase.from('client_assignments').delete().eq('id', assignmentId)
    if (!error) await fetchAssignments()
    return { error: error?.message ?? null }
  }

  return { assignments, loading, refresh: fetchAssignments, assign, unassign }
}
