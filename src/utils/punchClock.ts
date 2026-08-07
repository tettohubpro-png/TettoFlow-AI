import { supabase } from '@/lib/supabase'

const AUTO_SUMMARY = 'Ponto automático — sessão online'

function durationMinutes(startedAt: string, endedAt = new Date().toISOString()) {
  const started = new Date(startedAt).getTime()
  const ended = new Date(endedAt).getTime()
  return Math.max(1, Math.round((ended - started) / 60000))
}

/** Fecha todas as sessões abertas do usuário (ponto de saída). */
export async function punchOutUser(
  workspaceId: string,
  userId: string,
  opts?: { keepalive?: boolean },
): Promise<void> {
  const { data: openRows } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .is('ended_at', null)

  if (!openRows?.length) return

  const ended = new Date().toISOString()
  for (const row of openRows) {
    const payload = {
      ended_at: ended,
      duration_minutes: durationMinutes(row.started_at, ended),
      updated_at: ended,
      summary: row.summary ?? AUTO_SUMMARY,
    }

    if (opts?.keepalive) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/work_sessions?id=eq.${row.id}`
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token ?? key
      fetch(url, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${token}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      }).catch(() => undefined)
    } else {
      await supabase.from('work_sessions').update(payload).eq('id', row.id)
    }
  }
}

/** Abre ponto automático se não houver sessão ativa hoje. */
export async function punchInUser(
  workspaceId: string,
  userId: string,
): Promise<{ error: string | null; started: boolean }> {
  const { data: openRows } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })

  const today = new Date().toISOString().slice(0, 10)
  const openToday = (openRows ?? []).filter((s) => s.started_at.slice(0, 10) === today)
  const stale = (openRows ?? []).filter((s) => s.started_at.slice(0, 10) !== today)

  for (const row of stale) {
    const endOfStartDay = `${row.started_at.slice(0, 10)}T23:59:59.000Z`
    const heartbeat =
      row.updated_at && row.updated_at > row.started_at ? row.updated_at : endOfStartDay
    const ended = heartbeat < endOfStartDay ? heartbeat : endOfStartDay
    await supabase
      .from('work_sessions')
      .update({
        ended_at: ended,
        duration_minutes: durationMinutes(row.started_at, ended),
        updated_at: new Date().toISOString(),
        summary: row.summary ?? AUTO_SUMMARY,
      })
      .eq('id', row.id)
  }

  if (openToday.length > 0) return { error: null, started: false }

  const { error } = await supabase.from('work_sessions').insert({
    workspace_id: workspaceId,
    user_id: userId,
    summary: AUTO_SUMMARY,
    started_at: new Date().toISOString(),
    deliverables: { notes: 'auto_punch' },
  })

  if (error) return { error: error.message, started: false }
  return { error: null, started: true }
}

export async function heartbeatSession(sessionId: string): Promise<void> {
  await supabase
    .from('work_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('ended_at', null)
}

export { AUTO_SUMMARY }
