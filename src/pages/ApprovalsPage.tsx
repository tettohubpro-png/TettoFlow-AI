import { useState } from 'react'
import { useApprovals } from '@/hooks/useApprovals'
import { useFiles } from '@/hooks/useFiles'
import { useAuth } from '@/contexts/AuthContext'
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_LABELS,
  canManageApprovals,
} from '@/utils/permissions'
import type { ApprovalStatus } from '@/types/database'

export function ApprovalsPage() {
  const { role } = useAuth()
  const { approvals, pending, loading, error, decide } = useApprovals()
  const { files, loading: filesLoading } = useFiles()
  const [note, setNote] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const canDecide = canManageApprovals(role ?? undefined)

  const handleDecide = async (
    approvalId: string,
    operationId: string,
    status: ApprovalStatus,
  ) => {
    setActionError(null)
    const { error: err } = await decide(approvalId, operationId, status, note[approvalId])
    if (err) setActionError(err)
  }

  const decided = approvals.filter((a) => a.status !== 'PENDING')

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Aprovações</h2>
        <p className="text-slate-400">Revisões internas e do cliente</p>
      </header>

      {(error || actionError) && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error || actionError}
        </p>
      )}

      <section className="mb-8">
        <h3 className="mb-4 font-semibold text-amber-300">
          Pendentes ({pending.length})
        </h3>
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : pending.length === 0 ? (
          <p className="text-slate-500">Nenhuma aprovação pendente.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => (
              <article
                key={a.id}
                className="rounded-xl border border-amber-500/20 bg-slate-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{a.operations?.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {a.operations?.clients?.name} ·{' '}
                      {APPROVAL_TYPE_LABELS[a.type]}
                    </p>
                  </div>
                  <span className="text-xs text-amber-400">
                    {APPROVAL_STATUS_LABELS[a.status]}
                  </span>
                </div>

                {canDecide && (
                  <div className="mt-4 space-y-3">
                    <input
                      placeholder="Observação (opcional)"
                      value={note[a.id] ?? ''}
                      onChange={(e) =>
                        setNote({ ...note, [a.id]: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecide(a.id, a.operation_id, 'APPROVED')}
                        className="min-h-11 flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 sm:flex-none"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDecide(a.id, a.operation_id, 'CHANGES_REQUESTED')
                        }
                        className="min-h-11 flex-1 rounded-lg bg-amber-600/80 px-4 py-2 text-sm hover:bg-amber-500 sm:flex-none"
                      >
                        Alterações
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(a.id, a.operation_id, 'REJECTED')}
                        className="min-h-11 flex-1 rounded-lg bg-red-600/80 px-4 py-2 text-sm hover:bg-red-500 sm:flex-none"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="mb-4 font-semibold text-slate-300">Histórico</h3>
        {decided.length === 0 ? (
          <p className="text-slate-500">Sem histórico ainda.</p>
        ) : (
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">{a.operations?.title}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.operations?.clients?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {APPROVAL_TYPE_LABELS[a.type]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          a.status === 'APPROVED'
                            ? 'text-emerald-400'
                            : a.status === 'REJECTED'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }
                      >
                        {APPROVAL_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(a.updated_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 font-semibold text-violet-300">Arquivos do workspace</h3>
        {filesLoading ? (
          <p className="text-slate-500">Carregando arquivos...</p>
        ) : files.length === 0 ? (
          <p className="text-slate-500">Nenhum arquivo cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.clients?.name}</p>
                </div>
                {f.storage_path.startsWith('http') ? (
                  <a
                    href={f.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Abrir
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">{f.mime_type ?? 'arquivo'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
