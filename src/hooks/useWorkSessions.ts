import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkDeliverables, WorkSession } from '@/types/database'
import { logProjectActivity } from '@/utils/activityLog'
import { isEmployee } from '@/utils/permissions'
import {
  AUTO_SUMMARY,
  heartbeatSession,
  punchInUser,
  punchOutUser,
} from '@/utils/punchClock'

function dayBounds(dayIso: string) {
  return {
    start: `${dayIso}T00:00:00.000Z`,
    end: `${dayIso}T23:59:59.999Z`,
  }
}

function durationMinutes(startedAt: string, endedAt = new Date().toISOString()) {
  const started = new Date(startedAt).getTime()
  const ended = new Date(endedAt).getTime()
  return Math.max(1, Math.round((ended - started) / 60000))
}

export function useWorkSessions(dayIso?: string) {
  const { workspace, user } = useAuth()
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    if (!workspace?.id) {
      setSessions([])
      setActiveSession(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const day = dayIso ?? new Date().toISOString().slice(0, 10)
    const { start, end } = dayBounds(day)

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

  const ensureAutoPunchIn = useCallback(async () => {
    if (!workspace?.id || !user?.id) return { error: 'Sessão inválida', started: false }
    const result = await punchInUser(workspace.id, user.id)
    if (!result.error) await fetchSessions()
    return result
  }, [workspace?.id, user?.id, fetchSessions])

  const punchOut = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      if (!workspace?.id || !user?.id) return { error: 'Sessão inválida' }
      await punchOutUser(workspace.id, user.id, opts)
      setActiveSession(null)
      if (!opts?.keepalive) await fetchSessions()
      return { error: null }
    },
    [workspace?.id, user?.id, fetchSessions],
  )

  const heartbeat = useCallback(async () => {
    if (!activeSession?.id || activeSession.ended_at) return
    await heartbeatSession(activeSession.id)
  }, [activeSession?.id, activeSession?.ended_at])

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

    const ended = new Date().toISOString()
    const minutes = durationMinutes(session.started_at, ended)

    const { error } = await supabase
      .from('work_sessions')
      .update({
        ended_at: ended,
        duration_minutes: minutes,
        deliverables,
        summary: summary ?? session.summary,
        updated_at: ended,
      })
      .eq('id', sessionId)

    if (!error) {
      await logProjectActivity(workspace.id, user?.id ?? null, 'work_session', sessionId, 'stop', {
        duration_minutes: minutes,
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
    ensureAutoPunchIn,
    punchOut,
    heartbeat,
    refresh: fetchSessions,
  }
}

const HEARTBEAT_MS = 60_000

/** Ponto automático: inicia no login do funcionário e encerra ao sair/fechar. */
export function AutoPunchClock() {
  const { role, user, workspace, loading } = useAuth()
  const punchedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading || !user || !workspace || !isEmployee(role)) return
    if (punchedUserRef.current === user.id) return

    let cancelled = false
    ;(async () => {
      const result = await punchInUser(workspace.id, user.id)
      if (!cancelled) {
        punchedUserRef.current = user.id
        if (result.error) console.warn('Ponto automático:', result.error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, user?.id, workspace?.id, role])

  useEffect(() => {
    if (!isEmployee(role) || !user || !workspace) return

    const tick = async () => {
      const { data } = await supabase
        .from('work_sessions')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .limit(1)
        .maybeSingle()
      if (data?.id) await heartbeatSession(data.id)
    }

    const id = window.setInterval(() => {
      tick().catch(() => undefined)
    }, HEARTBEAT_MS)

    return () => {
      window.clearInterval(id)
    }
  }, [role, user?.id, workspace?.id])

  return null
}

export { AUTO_SUMMARY }
