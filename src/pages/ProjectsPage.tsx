import { useState } from 'react'
import type { FormEvent } from 'react'
import { useOperations } from '@/hooks/useOperations'
import { useClients } from '@/hooks/useClients'
import { useApprovals } from '@/hooks/useApprovals'
import {
  OPERATION_STATUS_LABELS,
  OPERATION_STATUS_ORDER,
  nextOperationStatus,
} from '@/utils/permissions'
import type { OperationStatus } from '@/types/database'

export function ProjectsPage() {
  const { operations, loading, createOperation, updateStatus } = useOperations()
  const { clients } = useClients()
  const { requestApproval } = useApprovals()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', title: '' })
  const [requestingId, setRequestingId] = useState<string | null>(null)

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await createOperation(form)
    if (!error) {
      setShowForm(false)
      setForm({ client_id: '', title: '' })
    }
  }

  const advance = async (operationId: string, current: OperationStatus) => {
    const next = nextOperationStatus(current) as OperationStatus | null
    if (!next) return
    await updateStatus(operationId, next)
  }

  const handleRequestApproval = async (operationId: string, type: 'INTERNAL' | 'CLIENT') => {
    setRequestingId(operationId)
    await requestApproval(operationId, type)
    setRequestingId(null)
  }

  const byStatus = OPERATION_STATUS_ORDER.map((status) => ({
    status,
    items: operations.filter((op) => op.status === status),
  }))

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Operações</h2>
          <p className="text-sm text-slate-400">Pipeline de produção</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
        >
          {showForm ? 'Cancelar' : 'Nova operação'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"
        >
          <select
            required
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="">Selecione o cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Título da operação"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-emerald-600 py-2.5 sm:col-span-2"
          >
            Criar operação
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-5">
          {byStatus.map(({ status, items }) => (
            <div
              key={status}
              className="w-[78vw] max-w-xs shrink-0 rounded-xl border border-slate-800 bg-slate-900/30 p-3 sm:w-auto sm:max-w-none"
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {OPERATION_STATUS_LABELS[status]} ({items.length})
              </h3>
              <ul className="space-y-2">
                {items.map((op) => (
                  <li
                    key={op.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
                  >
                    <p className="font-medium break-words">{op.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{op.clients?.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {status !== 'DONE' && (
                        <button
                          type="button"
                          onClick={() => advance(op.id, op.status)}
                          className="min-h-9 rounded-md bg-emerald-600/15 px-2.5 text-xs text-emerald-300"
                        >
                          Avançar →
                        </button>
                      )}
                      {['PRODUCTION', 'REVIEW'].includes(status) && (
                        <>
                          <button
                            type="button"
                            disabled={requestingId === op.id}
                            onClick={() => handleRequestApproval(op.id, 'INTERNAL')}
                            className="min-h-9 rounded-md bg-sky-600/15 px-2.5 text-xs text-sky-300 disabled:opacity-50"
                          >
                            Aprov. interna
                          </button>
                          <button
                            type="button"
                            disabled={requestingId === op.id}
                            onClick={() => handleRequestApproval(op.id, 'CLIENT')}
                            className="min-h-9 rounded-md bg-violet-600/15 px-2.5 text-xs text-violet-300 disabled:opacity-50"
                          >
                            Aprov. cliente
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
