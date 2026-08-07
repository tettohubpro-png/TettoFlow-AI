import { StatCard } from '@/components/ui/StatCard'
import { PostCalendar } from '@/components/dashboard/PostCalendar'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useOperations } from '@/hooks/useOperations'
import { OPERATION_STATUS_LABELS } from '@/utils/permissions'

export function DashboardPage() {
  const { stats, loading } = useDashboardStats()
  const { operations } = useOperations()

  const pendingReviews = operations.filter((op) => op.status === 'REVIEW')
  const today = new Date().toISOString().slice(0, 10)
  const todayOps = operations.filter(
    (op) => op.deadline && op.deadline.startsWith(today),
  )

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
      </div>

      <div className="mt-6 sm:mt-8">
        <PostCalendar operations={operations} />
      </div>

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
