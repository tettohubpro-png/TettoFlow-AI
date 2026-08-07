import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOperations } from '@/hooks/useOperations'
import { OPERATION_STATUS_LABELS, OPERATION_PRIORITY_LABELS } from '@/utils/permissions'

function dayKey(iso: string | null | undefined) {
  return iso?.slice(0, 10) ?? null
}

function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export function AgendaPage() {
  const { operations, loading } = useOperations()

  const groups = useMemo(() => {
    const items = operations
      .map((op) => {
        const date = dayKey(op.deadline) ?? dayKey(op.start_date)
        if (!date) return null
        return { op, date, kind: dayKey(op.deadline) ? ('prazo' as const) : ('início' as const) }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.date.localeCompare(b.date) || a.op.title.localeCompare(b.op.title))

    const map = new Map<string, typeof items>()
    for (const item of items) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return [...map.entries()]
  }, [operations])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = groups.filter(([d]) => d >= today)
  const past = groups.filter(([d]) => d < today).reverse()

  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <h2 className="tf-title text-xl sm:text-2xl">Agenda</h2>
        <p className="tf-subtitle mt-1">Entregas, gravações e prazos das operações</p>
      </header>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          Carregando…
        </p>
      ) : groups.length === 0 ? (
        <div className="tf-panel p-6 text-center text-sm" style={{ color: 'var(--color-text3)' }}>
          Nenhum prazo ou data de início cadastrado.{' '}
          <Link to="/projetos" className="underline" style={{ color: 'var(--color-accent)' }}>
            Abrir operações
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <AgendaSection title="Próximos" entries={upcoming} empty="Nada agendado à frente." highlightToday={today} />
          {past.length > 0 && (
            <AgendaSection title="Anteriores" entries={past.slice(0, 14)} empty="" highlightToday={today} />
          )}
        </div>
      )}
    </div>
  )
}

function AgendaSection({
  title,
  entries,
  empty,
  highlightToday,
}: {
  title: string
  entries: [string, { op: { id: string; title: string; status: string; priority: string; clients?: { name: string }; deadline: string | null; start_date: string | null }; date: string; kind: 'prazo' | 'início' }[]][]
  empty: string
  highlightToday: string
}) {
  if (entries.length === 0) {
    return empty ? (
      <section>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          {empty}
        </p>
      </section>
    ) : null
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>
        {title}
      </h3>
      <div className="space-y-4">
        {entries.map(([date, items]) => (
          <div key={date} className="tf-panel overflow-hidden">
            <div
              className="flex items-center justify-between gap-2 px-4 py-2.5"
              style={{
                background:
                  date === highlightToday ? 'var(--color-accent-dim)' : 'var(--color-bg3)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <p className="text-sm font-semibold capitalize">{formatDay(date)}</p>
              {date === highlightToday && (
                <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                  Hoje
                </span>
              )}
            </div>
            <ul>
              {items.map(({ op, kind }) => (
                <li
                  key={`${op.id}-${kind}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{op.title}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                      {op.clients?.name ?? 'Sem cliente'} · {kind === 'prazo' ? 'Prazo' : 'Início'} ·{' '}
                      {OPERATION_PRIORITY_LABELS[op.priority] ?? op.priority}
                    </p>
                  </div>
                  <span className="tf-chip">{OPERATION_STATUS_LABELS[op.status] ?? op.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
