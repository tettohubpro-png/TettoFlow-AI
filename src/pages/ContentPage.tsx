import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PostCalendar } from '@/components/dashboard/PostCalendar'
import { useOperations } from '@/hooks/useOperations'
import { OPERATION_STATUS_LABELS, OPERATION_STATUS_ORDER } from '@/utils/permissions'

type ViewMode = 'lista' | 'calendario'

export function ContentPage() {
  const { operations, loading } = useOperations()
  const [view, setView] = useState<ViewMode>('lista')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const contentOps = useMemo(() => {
    const base = operations.filter((op) => {
      const title = op.title.toLowerCase()
      const isContent =
        /post|conte[uú]do|reels|stories|instagram|calend[aá]rio|feed|carrossel/i.test(title) ||
        op.status === 'APPROVED' ||
        op.status === 'PUBLISHED' ||
        op.status === 'REVIEW' ||
        op.status === 'CLIENT'
      return isContent
    })
    if (statusFilter === 'all') return base
    return base.filter((op) => op.status === statusFilter)
  }, [operations, statusFilter])

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2 className="tf-title text-xl sm:text-2xl">Conteúdo</h2>
          <p className="tf-subtitle mt-1">Calendário editorial e status das postagens</p>
        </div>
        <Link to="/projetos" className="tf-btn tf-btn-ghost text-sm">
          Ver operações (kanban)
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--color-border)' }}>
          {(['lista', 'calendario'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{
                background: view === mode ? 'var(--color-accent-dim)' : 'transparent',
                color: view === mode ? 'var(--color-accent)' : 'var(--color-text3)',
              }}
            >
              {mode === 'lista' ? 'Lista' : 'Calendário'}
            </button>
          ))}
        </div>
        <select
          className="tf-select max-w-[12rem]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os status</option>
          {OPERATION_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {OPERATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          Carregando…
        </p>
      ) : view === 'calendario' ? (
        <PostCalendar operations={contentOps.length ? contentOps : operations} />
      ) : (
        <div className="tf-panel overflow-hidden">
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {contentOps.length === 0 && (
              <li className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
                Nenhum conteúdo encontrado. Crie operações em Projetos.
              </li>
            )}
            {contentOps.map((op) => (
              <li
                key={op.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{op.title}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                    {op.clients?.name ?? 'Sem cliente'}
                    {op.deadline ? ` · prazo ${op.deadline.slice(0, 10)}` : ''}
                  </p>
                </div>
                <span className="tf-chip">{OPERATION_STATUS_LABELS[op.status] ?? op.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
