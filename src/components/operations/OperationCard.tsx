import type { Operation } from '@/types/database'
import type { OperationExtendedMeta } from '@/utils/operationExtras'
import { OPERATION_STATUS_LABELS } from '@/utils/permissions'

interface OperationCardProps {
  operation: Operation
  meta?: OperationExtendedMeta
  hasDescription?: boolean
  onEdit: () => void
  onAdvance: () => void
  onRevert: () => void
  onRequestApproval: (type: 'INTERNAL' | 'CLIENT') => void
  requestingApproval: boolean
  canRevert: boolean
  canAdvance: boolean
}

function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function OperationCard({
  operation,
  meta,
  hasDescription,
  onEdit,
  onAdvance,
  onRevert,
  onRequestApproval,
  requestingApproval,
  canRevert,
  canAdvance,
}: OperationCardProps) {
  const deadlineLabel = formatShortDate(operation.deadline)
  const status = operation.status

  return (
    <li className="group relative rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm transition hover:border-sky-500/40">
      {meta?.labels?.[0] && (
        <span
          className="mb-2 block h-1.5 w-10 rounded-full"
          style={{ backgroundColor: meta.labels[0].color }}
        />
      )}

      <button
        type="button"
        onClick={onEdit}
        className="absolute right-2 top-2 rounded-full bg-slate-800/90 p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-700 hover:text-white"
        aria-label="Editar solicitação"
        title="Editar"
      >
        ✏️
      </button>

      <button type="button" onClick={onEdit} className="w-full text-left">
        <p className="pr-8 font-medium break-words">{operation.title}</p>
        <p className="mt-1 text-xs text-slate-500">{operation.clients?.name}</p>
      </button>

      {(deadlineLabel || hasDescription || (meta?.checklist?.length ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {deadlineLabel && (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
              🕐 {deadlineLabel}
            </span>
          )}
          {hasDescription && (
            <span className="text-slate-500" title="Possui descrição">
              ☰
            </span>
          )}
          {(meta?.checklist?.length ?? 0) > 0 && (
            <span className="text-xs text-slate-500">
              ☑{' '}
              {meta!.checklist.filter((c) => c.done).length}/{meta!.checklist.length}
            </span>
          )}
        </div>
      )}

      {meta?.labels && meta.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {meta.labels.map((label) => (
            <span
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-900"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {canRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="min-h-9 rounded-md bg-amber-600/15 px-2.5 text-xs text-amber-300 hover:bg-amber-600/25"
          >
            ← Voltar
          </button>
        )}
        {canAdvance && (
          <button
            type="button"
            onClick={onAdvance}
            className="min-h-9 rounded-md bg-emerald-600/15 px-2.5 text-xs text-emerald-300 hover:bg-emerald-600/25"
          >
            Avançar →
          </button>
        )}
        {['PRODUCTION', 'REVIEW'].includes(status) && (
          <>
            <button
              type="button"
              disabled={requestingApproval}
              onClick={() => onRequestApproval('INTERNAL')}
              className="min-h-9 rounded-md bg-sky-600/15 px-2.5 text-xs text-sky-300 disabled:opacity-50"
            >
              Aprov. interna
            </button>
            <button
              type="button"
              disabled={requestingApproval}
              onClick={() => onRequestApproval('CLIENT')}
              className="min-h-9 rounded-md bg-violet-600/15 px-2.5 text-xs text-violet-300 disabled:opacity-50"
            >
              Aprov. cliente
            </button>
          </>
        )}
      </div>

      <p className="mt-1 text-[10px] text-slate-600">{OPERATION_STATUS_LABELS[status]}</p>
    </li>
  )
}
