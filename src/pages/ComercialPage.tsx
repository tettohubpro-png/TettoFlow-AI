import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { CLIENT_STATUS_LABELS } from '@/utils/permissions'
import type { ClientStatus } from '@/types/database'

const COLUMNS: ClientStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED']

export function ComercialPage() {
  const { clients, loading } = useClients()

  const byStatus = useMemo(() => {
    const map: Record<ClientStatus, typeof clients> = {
      ACTIVE: [],
      INACTIVE: [],
      ARCHIVED: [],
    }
    for (const c of clients) {
      ;(map[c.status] ?? map.ACTIVE).push(c)
    }
    return map
  }, [clients])

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2 className="tf-title text-xl sm:text-2xl">CRM</h2>
          <p className="tf-subtitle mt-1">Funil comercial por status do cliente</p>
        </div>
        <Link to="/crm" className="tf-btn tf-btn-ghost text-sm">
          Ver lista de clientes
        </Link>
      </header>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          Carregando…
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {COLUMNS.map((status) => (
            <section key={status} className="tf-panel flex min-h-[12rem] flex-col overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2.5"
                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg3)' }}
              >
                <h3 className="text-sm font-semibold">{CLIENT_STATUS_LABELS[status]}</h3>
                <span className="tf-chip">{byStatus[status].length}</span>
              </div>
              <ul className="flex-1 space-y-2 p-3">
                {byStatus[status].length === 0 && (
                  <li className="text-center text-xs" style={{ color: 'var(--color-text3)' }}>
                    Vazio
                  </li>
                )}
                {byStatus[status].map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/crm/${c.id}`}
                      className="block rounded-lg px-3 py-2 text-sm no-underline transition-colors"
                      style={{
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                        {[c.segment, c.city].filter(Boolean).join(' · ') || 'Sem segmento'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
