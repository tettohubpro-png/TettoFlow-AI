import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOperations } from '@/hooks/useOperations'
import { OPERATION_STATUS_LABELS } from '@/utils/permissions'

/**
 * Dashboard do nível "Operação" (papel Funcionário) — nunca mostra nada
 * administrativo (receita, leads, financeiro): só as próprias demandas.
 * O banco (RLS de `operations`) já devolve só as operações onde
 * responsible_id = eu, então não precisa filtrar de novo aqui — é reforço
 * visual, não segurança (a segurança já está no Postgres).
 */
export function EmployeeDashboard() {
  const { appUser } = useAuth()
  const { operations, loading } = useOperations()

  const today = new Date().toISOString().slice(0, 10)
  const todayDemands = operations.filter(
    (op) => op.deadline?.startsWith(today) && op.status !== 'DONE',
  )
  const monthStart = `${today.slice(0, 7)}-01`
  const doneThisMonth = operations.filter(
    (op) => op.status === 'DONE' && op.updated_at >= monthStart,
  )
  const urgent = operations.filter(
    (op) => op.status !== 'DONE' && (op.priority === 'HIGH' || op.priority === 'CRITICAL'),
  )
  const inRevision = operations.filter((op) => op.status === 'REVISION')

  const openDemands = operations
    .filter((op) => op.status !== 'DONE')
    .sort((a, b) => {
      const ad = a.deadline ?? '9999'
      const bd = b.deadline ?? '9999'
      return ad.localeCompare(bd)
    })

  return (
    <div>
      <header className="mb-4 sm:mb-8">
        <h2 className="text-xl font-bold sm:text-2xl">
          Olá, {appUser?.name?.split(' ')[0] ?? 'você'}
        </h2>
        <p className="text-sm text-slate-400 sm:text-base">Suas demandas de hoje</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Demandas de hoje" value={loading ? '—' : todayDemands.length} accent="text-violet-400" />
        <StatTile label="Prontas este mês" value={loading ? '—' : doneThisMonth.length} accent="text-emerald-400" />
        <StatTile label="Urgência" value={loading ? '—' : urgent.length} accent="text-red-400" />
        <StatTile label="Correções" value={loading ? '—' : inRevision.length} accent="text-amber-400" />
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:mt-8 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-300">Minhas demandas em aberto</h3>
          <Link to="/tarefas" className="text-xs text-emerald-300 hover:underline">
            ver todas →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : openDemands.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma demanda em aberto — tudo em dia! 🎉</p>
        ) : (
          <ul className="space-y-2">
            {openDemands.slice(0, 8).map((op) => (
              <li
                key={op.id}
                className="flex flex-col gap-1 rounded-lg bg-slate-950/60 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">{op.title}</p>
                  <p className="text-xs text-slate-500">{op.clients?.name}</p>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  {op.deadline && (
                    <span>{new Date(op.deadline).toLocaleDateString('pt-BR')}</span>
                  )}
                  <span className="rounded-full bg-slate-800 px-2 py-0.5">
                    {OPERATION_STATUS_LABELS[op.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}
