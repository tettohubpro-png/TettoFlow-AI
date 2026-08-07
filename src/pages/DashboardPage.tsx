import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/StatCard'
import { PostCalendar } from '@/components/dashboard/PostCalendar'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useOperations } from '@/hooks/useOperations'
import { OPERATION_STATUS_LABELS, OPERATION_STATUS_ORDER } from '@/utils/permissions'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DashboardPage() {
  const { stats, loading } = useDashboardStats()
  const { operations } = useOperations()

  const pendingReviews = operations.filter((op) => op.status === 'REVIEW')
  const today = new Date().toISOString().slice(0, 10)
  const todayOps = operations.filter(
    (op) => op.deadline && op.deadline.startsWith(today),
  )
  const recentContent = [...operations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
  const statusCounts = OPERATION_STATUS_ORDER.map((status) => ({
    status,
    count: operations.filter((op) => op.status === status).length,
  }))

  return (
    <div>
      <header className="mb-4 sm:mb-8">
        <h2 className="text-xl font-bold sm:text-2xl">Dashboard</h2>
        <p className="text-sm text-slate-400 sm:text-base">Visão geral da operação TettoHub</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Clientes ativos" value={loading ? '—' : stats.activeClients} />
        <StatCard
          label="Operações em andamento"
          value={loading ? '—' : stats.pendingOperations}
          accent="text-amber-400"
        />
        <StatCard
          label="Em revisão"
          value={loading ? '—' : stats.pendingApprovals}
          accent="text-sky-400"
        />
        <StatCard
          label="Agenda de hoje"
          value={loading ? '—' : stats.todayAgenda}
          accent="text-violet-400"
        />
        <StatCard
          label="Novos leads (7 dias)"
          value={loading ? '—' : stats.newLeadsWeek}
          accent="text-fuchsia-400"
        />
        <StatCard
          label="Mensagens recebidas (7 dias)"
          value={loading ? '—' : stats.messagesWeek}
          accent="text-sky-400"
        />
        <StatCard
          label="Conteúdos este mês"
          value={loading ? '—' : stats.contentThisMonth}
          accent="text-emerald-400"
        />
        <StatCard
          label="Tarefas pendentes"
          value={loading ? '—' : stats.tasksPending}
          accent="text-amber-400"
        />
        <StatCard
          label="Receita do mês"
          value={loading ? '—' : formatBRL(stats.revenueMonth)}
          accent="text-emerald-400"
        />
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:mt-8 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-300">Status dos conteúdos</h3>
          <Link to="/projetos" className="text-xs text-emerald-300 hover:underline">
            ver todos →
          </Link>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {statusCounts.map(({ status, count }) => (
            <Link
              key={status}
              to="/projetos"
              className="min-w-24 shrink-0 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-center hover:border-slate-700"
            >
              <p className="text-lg font-bold text-slate-200">{count}</p>
              <p className="text-[11px] text-slate-500">{OPERATION_STATUS_LABELS[status]}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 sm:mt-8">
        <PostCalendar operations={operations} />
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:mt-8 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-300">Conteúdos recentes</h3>
          <Link to="/projetos" className="text-xs text-emerald-300 hover:underline">
            ver todos →
          </Link>
        </div>
        {recentContent.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum conteúdo ainda.</p>
        ) : (
          <ul className="space-y-2">
            {recentContent.map((op) => (
              <li
                key={op.id}
                className="flex flex-col gap-1 rounded-lg bg-slate-950/60 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="break-words">{op.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  {op.clients?.name}
                  <span className="rounded-full bg-slate-800 px-2 py-0.5">
                    {OPERATION_STATUS_LABELS[op.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="font-semibold text-emerald-300">Em revisão</h3>
          <ul className="mt-4 space-y-2">
            {pendingReviews.length === 0 && (
              <li className="text-sm text-slate-500">Nenhuma operação em revisão</li>
            )}
            {pendingReviews.map((op) => (
              <li
                key={op.id}
                className="flex flex-col gap-1 rounded-lg bg-slate-950/60 px-3 py-2.5 text-sm sm:flex-row sm:justify-between"
              >
                <span className="break-words">{op.title}</span>
                <span className="shrink-0 text-slate-500">{op.clients?.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="font-semibold text-violet-300">Agenda do dia</h3>
          <ul className="mt-4 space-y-2">
            {todayOps.length === 0 && (
              <li className="text-sm text-slate-500">Nada com prazo hoje</li>
            )}
            {todayOps.map((op) => (
              <li
                key={op.id}
                className="flex flex-col gap-1 rounded-lg bg-slate-950/60 px-3 py-2.5 text-sm sm:flex-row sm:justify-between"
              >
                <span className="break-words">{op.title}</span>
                <span className="shrink-0 text-slate-500">
                  {OPERATION_STATUS_LABELS[op.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
