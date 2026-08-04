import { useMemo, useState } from 'react'
import { useWorkSessions } from '@/hooks/useWorkSessions'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { DEPARTMENT_LABELS } from '@/utils/departments'
import { canViewTeamReports } from '@/utils/permissions'
import type { Department, WorkDeliverables } from '@/types/database'

export function ReportsPage() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const { sessions, activeSession, loading, startSession, stopSession } = useWorkSessions(day)
  const { clients } = useClients()
  const { role, appUser } = useAuth()
  const canViewAll = canViewTeamReports(role ?? undefined)

  const [clientId, setClientId] = useState('')
  const [department, setDepartment] = useState<Department>('design')
  const [posts, setPosts] = useState('0')
  const [themes, setThemes] = useState('')
  const [driveFiles, setDriveFiles] = useState('')
  const [summary, setSummary] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const visibleSessions = useMemo(() => {
    if (canViewAll) return sessions
    return sessions.filter((s) => s.user_id === appUser?.id)
  }, [sessions, canViewAll, appUser?.id])

  const totals = useMemo(() => {
    const minutes = visibleSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0)
    const postsCount = visibleSessions.reduce(
      (acc, s) => acc + (Number(s.deliverables?.posts) || 0),
      0,
    )
    return { minutes, postsCount, count: visibleSessions.length }
  }, [visibleSessions])

  const handleStart = async () => {
    const { error } = await startSession({
      client_id: clientId || undefined,
      department,
      summary: summary || undefined,
    })
    setFeedback(error ?? 'Cronômetro iniciado.')
  }

  const handleStop = async () => {
    if (!activeSession) return
    const deliverables: WorkDeliverables = {
      posts: Number(posts) || 0,
      themes: themes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      companies: clientId
        ? [clients.find((c) => c.id === clientId)?.name ?? ''].filter(Boolean)
        : [],
      drive_files: driveFiles
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      video_themes:
        department === 'videomaker' || department === 'video_editor'
          ? themes
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
    }
    const { error } = await stopSession(activeSession.id, deliverables, summary)
    setFeedback(error ?? 'Sessão finalizada e salva no relatório diário.')
    setPosts('0')
    setThemes('')
    setDriveFiles('')
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório diário</h2>
          <p className="text-slate-400">
            Tempo e entregas por funcionário (design, vídeo, tráfego…)
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

      <section className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Sessões</p>
          <p className="text-2xl font-semibold">{totals.count}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Minutos</p>
          <p className="text-2xl font-semibold">{totals.minutes}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Posts registrados</p>
          <p className="text-2xl font-semibold">{totals.postsCount}</p>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Meu cronômetro</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Empresa / cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {Object.entries(DEPARTMENT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="O que está fazendo"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>

        {activeSession ? (
          <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
            <p className="text-sm text-emerald-300">
              Em andamento desde{' '}
              {new Date(activeSession.started_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="number"
                min={0}
                value={posts}
                onChange={(e) => setPosts(e.target.value)}
                placeholder="Qtd. posts"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                placeholder="Temas (separados por vírgula)"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={driveFiles}
                onChange={(e) => setDriveFiles(e.target.value)}
                placeholder="Arquivos Drive (links ou nomes)"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-3"
              />
            </div>
            <button
              type="button"
              onClick={handleStop}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500"
            >
              Finalizar e salvar entrega
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="mt-4 rounded-lg border border-emerald-600/40 bg-emerald-600/15 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-600/25"
          >
            Iniciar cronômetro
          </button>
        )}
        {feedback && <p className="mt-2 text-xs text-slate-400">{feedback}</p>}
      </section>

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Entregas do dia
      </h3>
      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : visibleSessions.length === 0 ? (
        <p className="text-slate-500">Nenhuma sessão neste dia.</p>
      ) : (
        <ul className="space-y-2">
          {visibleSessions.map((s) => (
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
                      : '—'}
                  </p>
                </div>
                <p className="text-xs text-emerald-400">
                  {s.ended_at ? `${s.duration_minutes ?? 0} min` : 'Em andamento'}
                </p>
              </div>
              {s.summary && <p className="mt-1 text-xs text-slate-400">{s.summary}</p>}
              <p className="mt-1 text-xs text-slate-500">
                Posts: {s.deliverables?.posts ?? 0}
                {s.deliverables?.themes?.length
                  ? ` · Temas: ${s.deliverables.themes.join(', ')}`
                  : ''}
                {s.deliverables?.drive_files?.length
                  ? ` · Drive: ${s.deliverables.drive_files.join(', ')}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
