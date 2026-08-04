import { useMemo, useState } from 'react'
import { useDepartmentQueue } from '@/hooks/useDepartmentQueue'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useClientAssignments } from '@/hooks/useClientAssignments'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import {
  ASSIGNABLE_DEPARTMENTS,
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
} from '@/utils/departments'
import type { Department } from '@/types/database'
import {
  OPERATION_STATUS_LABELS,
  OPERATION_PRIORITY_LABELS,
  JOB_ROLE_LABELS,
  canAssignTasks,
} from '@/utils/permissions'
import type { JobRole, OperationStatus } from '@/types/database'

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-amber-400',
  MEDIUM: 'text-sky-400',
  LOW: 'text-slate-500',
}

export function DepartmentsPage() {
  const { byDepartment, counts, loading, updateStatus, assignResponsible } = useDepartmentQueue()
  const { members } = useTeamMembers()
  const { clients } = useClients()
  const { assignments, assign } = useClientAssignments()
  const { role } = useAuth()
  const [active, setActive] = useState<Department>('social_media')
  const [assignClientId, setAssignClientId] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignDept, setAssignDept] =
    useState<(typeof ASSIGNABLE_DEPARTMENTS)[number]>('social_media')
  const [message, setMessage] = useState<string | null>(null)

  const items = byDepartment[active]
  const canAssign = canAssignTasks(role ?? undefined)

  const membersByDept = useMemo(() => {
    return members.filter((m) => {
      if (!m.job_role) return true
      if (active === 'general') return true
      return m.job_role === active || m.job_role === 'gerente' || m.job_role === 'gestor'
    })
  }, [members, active])

  const clientTeam = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const a of assignments) {
      const label = `${DEPARTMENT_LABELS[a.department as Department] ?? a.department}: ${a.users?.name ?? '—'}`
      map[a.client_id] = [...(map[a.client_id] ?? []), label]
    }
    return map
  }, [assignments])

  const advance = async (id: string, status: OperationStatus) => {
    const order = ['DRAFT', 'SUBMITTED', 'ANALYSIS', 'PRODUCTION', 'REVIEW'] as const
    const idx = order.indexOf(status as (typeof order)[number])
    if (idx < 0 || idx >= order.length - 1) return
    await updateStatus(id, order[idx + 1])
  }

  const handleAssignClientTeam = async () => {
    if (!assignClientId || !assignUserId) return
    const { error } = await assign(assignClientId, assignUserId, assignDept)
    setMessage(error ? `Erro: ${error}` : 'Funcionário vinculado ao cliente.')
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Departamentos</h2>
        <p className="text-slate-400">Filas de trabalho por área e atribuição por cliente</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {DEPARTMENT_ORDER.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => setActive(dept)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              active === dept
                ? 'bg-emerald-500/20 font-medium text-emerald-300'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {DEPARTMENT_LABELS[dept]} ({counts[dept]})
          </button>
        ))}
      </div>

      {canAssign && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Destinar funcionário ao cliente
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <select
              value={assignClientId}
              onChange={(e) => setAssignClientId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={assignDept}
              onChange={(e) =>
                setAssignDept(e.target.value as (typeof ASSIGNABLE_DEPARTMENTS)[number])
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {ASSIGNABLE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Funcionário</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.name}
                  {m.job_role
                    ? ` (${JOB_ROLE_LABELS[m.job_role as JobRole] ?? m.job_role})`
                    : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAssignClientTeam}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Vincular
            </button>
          </div>
          {message && <p className="mt-2 text-xs text-slate-400">{message}</p>}
        </section>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando fila...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">Nenhuma operação nesta fila.</p>
      ) : (
        <div className="space-y-3">
          {items.map((op) => (
            <article
              key={op.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{op.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{op.clients?.name}</p>
                  {clientTeam[op.client_id]?.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Time: {clientTeam[op.client_id].join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs">
                  <p className={PRIORITY_COLORS[op.priority]}>
                    {OPERATION_PRIORITY_LABELS[op.priority] ?? op.priority}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {OPERATION_STATUS_LABELS[op.status]}
                  </p>
                </div>
              </div>

              {canAssign && (
                <label className="mt-3 block text-xs text-slate-400">
                  Responsável desta tarefa
                  <select
                    value={op.responsible_id ?? ''}
                    onChange={(e) =>
                      assignResponsible(op.id, e.target.value || null)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 sm:max-w-xs"
                  >
                    <option value="">Sem responsável</option>
                    {membersByDept.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {op.deadline && (
                <p className="mt-2 text-xs text-slate-400">
                  Prazo: {new Date(op.deadline).toLocaleDateString('pt-BR')}
                </p>
              )}
              {['DRAFT', 'SUBMITTED', 'ANALYSIS', 'PRODUCTION'].includes(op.status) && (
                <button
                  type="button"
                  onClick={() => advance(op.id, op.status)}
                  className="mt-3 text-xs text-emerald-400 hover:underline"
                >
                  Avançar para revisão →
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
