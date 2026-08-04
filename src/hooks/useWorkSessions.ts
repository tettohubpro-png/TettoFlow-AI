import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkDeliverables, WorkSession } from '@/types/database'
import { logProjectActivity } from '@/utils/activityLog'

export function useWorkSessions(dayIso?: string) {
  const { workspace, user } = useAuth()
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    if (!workspace?.id) {
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const day = dayIso ?? new Date().toISOString().slice(0, 10)
    const start = `${day}T00:00:00.000Z`
    const end = `${day}T23:59:59.999Z`

    const { data } = await supabase
      .from('work_sessions')
      .select('*, users(name, email), clients(name), operations(title)')
      .eq('workspace_id', workspace.id)
      .gte('started_at', start)
      .lte('started_at', end)
      .order('started_at', { ascending: false })

    const rows = (data ?? []) as WorkSession[]
    setSessions(rows)
    setActiveSession(rows.find((s) => !s.ended_at && s.user_id === user?.id) ?? null)
    setLoading(false)
  }, [workspace?.id, dayIso, user?.id])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const startSession = async (payload: {
    operation_id?: string
    client_id?: string
    department?: string
    summary?: string
  }) => {
    if (!workspace?.id || !user?.id) return { error: 'Sessão inválida' }

    if (activeSession) {
      return { error: 'Já existe um cronômetro ativo. Finalize antes de iniciar outro.' }
    }

    const { data, error } = await supabase
      .from('work_sessions')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        operation_id: payload.operation_id ?? null,
        client_id: payload.client_id ?? null,
        department: payload.department ?? null,
        summary: payload.summary ?? null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!error) {
      await logProjectActivity(workspace.id, user.id, 'work_session', data.id, 'start', payload)
      await fetchSessions()
    }
    return { error: error?.message ?? null }
  }

  const stopSession = async (
    sessionId: string,
    deliverables: WorkDeliverables,
    summary?: string,
  ) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }

    const session = sessions.find((s) => s.id === sessionId) ?? activeSession
    if (!session) return { error: 'Sessão não encontrada' }

    const ended = new Date()
    const started = new Date(session.started_at)
    const duration_minutes = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000))

    const { error } = await supabase
      .from('work_sessions')
      .update({
        ended_at: ended.toISOString(),
        duration_minutes,
        deliverables,
        summary: summary ?? session.summary,
        updated_at: ended.toISOString(),
      })
      .eq('id', sessionId)

    if (!error) {
      await logProjectActivity(workspace.id, user?.id ?? null, 'work_session', sessionId, 'stop', {
        duration_minutes,
        deliverables,
      })
      await fetchSessions()
    }
    return { error: error?.message ?? null }
  }

  return {
    sessions,
    activeSession,
    loading,
    startSession,
    stopSession,
    refresh: fetchSessions,
  }
}
