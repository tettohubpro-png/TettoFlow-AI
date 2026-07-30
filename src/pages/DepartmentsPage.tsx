import { useState } from 'react'
import { useDepartmentQueue } from '@/hooks/useDepartmentQueue'
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
} from '@/utils/departments'
import type { Department } from '@/types/database'
import {
  OPERATION_STATUS_LABELS,
  OPERATION_PRIORITY_LABELS,
} from '@/utils/permissions'
import type { OperationStatus } from '@/types/database'

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-amber-400',
  MEDIUM: 'text-sky-400',
  LOW: 'text-slate-500',
}

export function DepartmentsPage() {
  const { byDepartment, counts, loading, updateStatus } = useDepartmentQueue()
  const [active, setActive] = useState<Department>('social_media')

  const items = byDepartment[active]

  const advance = async (id: string, status: OperationStatus) => {
    const order = ['DRAFT', 'SUBMITTED', 'ANALYSIS', 'PRODUCTION', 'REVIEW'] as const
    const idx = order.indexOf(status as (typeof order)[number])
    if (idx < 0 || idx >= order.length - 1) return
    await updateStatus(id, order[idx + 1])
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Departamentos</h2>
        <p className="text-slate-400">Filas de trabalho por área</p>
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
              {op.deadline && (
                <p className="mt-2 text-xs text-violet-400">
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
