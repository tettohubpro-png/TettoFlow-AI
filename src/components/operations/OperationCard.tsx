import type { DragEvent } from 'react'
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
  onDelete?: () => void
  canDelete?: boolean
  requestingApproval: boolean
  canRevert: boolean
  canAdvance: boolean
  isDragging?: boolean
  onDragBegin?: () => void
  responsibleName?: string | null
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
  onDelete,
  canDelete,
  requestingApproval,
  canRevert,
  canAdvance,
  isDragging,
  onDragBegin,
  responsibleName,
}: OperationCardProps) {
  const deadlineLabel = formatShortDate(operation.deadline)
  const status = operation.status

  const handleDragStart = (e: DragEvent<HTMLLIElement>) => {
    e.dataTransfer.setData('application/x-operation-id', operation.id)
    e.dataTransfer.setData('application/x-operation-status', operation.status)
    e.dataTransfer.effectAllowed = 'move'
    onDragBegin?.()
  }

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      className={`group relative cursor-grab rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm transition active:cursor-grabbing hover:border-emerald-500/40 ${
        isDragging ? 'opacity-40 ring-2 ring-emerald-500/40' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="select-none text-xs tracking-widest" aria-hidden>
            ⠿
          </span>
          <span className="text-[10px] uppercase">Arrastar</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:border-emerald-600/50 hover:text-emerald-300"
            aria-label="Editar solicitação"
            title="Editar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Apagar esta solicitação? Ela será arquivada.')) onDelete()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:border-red-600/50 hover:text-red-400"
              aria-label="Apagar solicitação"
              title="Apagar (apenas proprietário)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {meta?.labels?.[0] && (
        <span
          className="mb-2 block h-1.5 w-10 rounded-full"
          style={{ backgroundColor: meta.labels[0].color }}
        />
      )}

      <button type="button" onClick={onEdit} className="w-full text-left">
        <p className="pr-2 font-medium break-words">{operation.title}</p>
        <p className="mt-1 text-xs text-slate-500">{operation.clients?.name}</p>
        {responsibleName && (
          <p className="mt-1 text-xs text-emerald-500/80">Resp.: {responsibleName}</p>
        )}
      </button>

      {(deadlineLabel || hasDescription || (meta?.checklist?.length ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {deadlineLabel && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {deadlineLabel}
            </span>
          )}
          {hasDescription && (
            <span className="text-slate-500" title="Possui descrição">
              ☰
            </span>
          )}
          {(meta?.checklist?.length ?? 0) > 0 && (
            <span className="text-xs text-slate-500">
              ☑ {meta!.checklist.filter((c) => c.done).length}/{meta!.checklist.length}
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

      <div
        className="mt-2 flex flex-wrap gap-2"
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      >
        {canRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="min-h-9 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-300 hover:border-slate-500"
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
              className="min-h-9 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-300 disabled:opacity-50"
            >
              Aprov. interna
            </button>
            <button
              type="button"
              disabled={requestingApproval}
              onClick={() => onRequestApproval('CLIENT')}
              className="min-h-9 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-300 disabled:opacity-50"
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
