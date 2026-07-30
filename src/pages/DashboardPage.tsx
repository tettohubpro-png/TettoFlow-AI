import { StatCard } from '@/components/ui/StatCard'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useProjects } from '@/hooks/useProjects'
import { PROJECT_STATUS_LABELS } from '@/utils/permissions'

export function DashboardPage() {
  const { stats, loading } = useDashboardStats()
  const { projects } = useProjects()

  const pendingApprovals = projects.filter((p) => p.status === 'approval')
  const todayProjects = projects.filter(
    (p) => p.due_date === new Date().toISOString().slice(0, 10),
  )

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-slate-400">Visão geral da operação TettoHub</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes ativos" value={loading ? '—' : stats.activeClients} />
        <StatCard
          label="Tarefas pendentes"
          value={loading ? '—' : stats.pendingTasks}
          accent="text-amber-400"
        />
        <StatCard
          label="Aprovações pendentes"
          value={loading ? '—' : stats.pendingApprovals}
          accent="text-sky-400"
        />
        <StatCard
          label="Agenda de hoje"
          value={loading ? '—' : stats.todayAgenda}
          accent="text-violet-400"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="font-semibold text-emerald-300">Aprovações pendentes</h3>
          <ul className="mt-4 space-y-2">
            {pendingApprovals.length === 0 && (
              <li className="text-sm text-slate-500">Nenhuma aprovação pendente</li>
            )}
            {pendingApprovals.map((p) => (
              <li
                key={p.id}
                className="flex justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span>{p.title}</span>
                <span className="text-slate-500">{p.clients?.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="font-semibold text-violet-300">Agenda do dia</h3>
          <ul className="mt-4 space-y-2">
            {todayProjects.length === 0 && (
              <li className="text-sm text-slate-500">Nada com prazo hoje</li>
            )}
            {todayProjects.map((p) => (
              <li
                key={p.id}
                className="flex justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span>{p.title}</span>
                <span className="text-slate-500">
                  {PROJECT_STATUS_LABELS[p.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
