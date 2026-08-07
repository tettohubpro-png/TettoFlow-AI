import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useWorkSessions } from '@/hooks/useWorkSessions'
import { useAuth } from '@/contexts/AuthContext'
import { DEPARTMENT_LABELS } from '@/utils/departments'
import { canViewTeamReports, isMaster } from '@/utils/permissions'
import type { Department } from '@/types/database'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m} min`
  return `${h}h ${m.toString().padStart(2, '0')}min`
}

function liveMinutes(startedAt: string, untilIso?: string) {
  const end = untilIso ? new Date(untilIso).getTime() : Date.now()
  return Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 60000))
}

const ONLINE_THRESHOLD_MS = 5 * 60_000

function isSessionOnline(endedAt: string | null, updatedAt: string) {
  if (endedAt) return false
  return Date.now() - new Date(updatedAt).getTime() < ONLINE_THRESHOLD_MS
}

export function ReportsPage() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const { sessions, loading } = useWorkSessions(day)
  const { role } = useAuth()
  const canView = canViewTeamReports(role ?? undefined)

  const byEmployee = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string
        name: string
        email: string
        minutes: number
        sessions: number
        online: boolean
        startedAt?: string
      }
    >()

    for (const s of sessions) {
      const key = s.user_id
      const current = map.get(key) ?? {
        userId: s.user_id,
        name: s.users?.name ?? 'Funcionário',
        email: s.users?.email ?? '',
        minutes: 0,
        sessions: 0,
        online: false,
      }
      current.sessions += 1
      const online = isSessionOnline(s.ended_at, s.updated_at)
      if (s.ended_at) {
        current.minutes += s.duration_minutes ?? 0
      } else if (online) {
        current.online = true
        current.startedAt = s.started_at
        current.minutes += liveMinutes(s.started_at)
      } else {
        // Sessão abandonada: conta até o último heartbeat
        current.minutes += liveMinutes(s.started_at, s.updated_at)
      }
      map.set(key, current)
    }

    return [...map.values()].sort((a, b) => b.minutes - a.minutes)
  }, [sessions])

  const totals = useMemo(() => {
    const minutes = byEmployee.reduce((acc, e) => acc + e.minutes, 0)
    const online = byEmployee.filter((e) => e.online).length
    return { minutes, online, people: byEmployee.length, sessions: sessions.length }
  }, [byEmployee, sessions.length])

  if (!isMaster(role) || !canView) {
    return <Navigate to="/" replace />
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ponto e relatório diário</h2>
          <p className="text-slate-400">
            Tempo online dos funcionários (ponto automático no login)
          </p>
        </div>
        <label className="text-sm text-slate-400">
          Dia
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
          />
        </label>
      </header>

      <section className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Funcionários</p>
          <p className="text-2xl font-semibold">{totals.people}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Online agora</p>
          <p className="text-2xl font-semibold text-emerald-400">{totals.online}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Tempo total</p>
          <p className="text-2xl font-semibold">{formatDuration(totals.minutes)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Sessões</p>
          <p className="text-2xl font-semibold">{totals.sessions}</p>
        </div>
      </section>

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Por funcionário
      </h3>
      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : byEmployee.length === 0 ? (
        <p className="text-slate-500">Nenhum ponto registrado neste dia.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {byEmployee.map((e) => (
            <li
              key={e.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{e.name}</p>
                <p className="truncate text-xs text-slate-500">{e.email}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {e.online ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Online desde{' '}
                    {e.startedAt
                      ? new Date(e.startedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Offline</span>
                )}
                <span className="font-semibold text-emerald-400">{formatDuration(e.minutes)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Sessões do dia
      </h3>
      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : sessions.length === 0 ? (
        <p className="text-slate-500">Nenhuma sessão neste dia.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{s.users?.name ?? 'Funcionário'}</p>
                  <p className="text-xs text-slate-500">
                    {s.clients?.name ?? '—'} ·{' '}
                    {s.department
                      ? DEPARTMENT_LABELS[s.department as Department] ?? s.department
                      : 'Operação'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(s.started_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {s.ended_at
                      ? ` → ${new Date(s.ended_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ' → agora'}
                  </p>
                </div>
                <p className="text-xs text-emerald-400">
                  {s.ended_at
                    ? formatDuration(s.duration_minutes ?? 0)
                    : isSessionOnline(s.ended_at, s.updated_at)
                      ? `${formatDuration(liveMinutes(s.started_at))} (online)`
                      : `${formatDuration(liveMinutes(s.started_at, s.updated_at))} (encerrada)`}
                </p>
              </div>
              {s.summary && <p className="mt-1 text-xs text-slate-400">{s.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
