import { useState } from 'react'
import type { DragEvent } from 'react'
import { LayoutGrid, Table2, CalendarDays } from 'lucide-react'
import { OperationCard } from '@/components/operations/OperationCard'
import { OperationModal } from '@/components/operations/OperationModal'
import { MonthCalendar } from '@/components/ui/MonthCalendar'
import { useOperations, type OperationDetails } from '@/hooks/useOperations'
import { useClients } from '@/hooks/useClients'
import { useApprovals } from '@/hooks/useApprovals'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import {
  OPERATION_STATUS_LABELS,
  OPERATION_STATUS_ORDER,
  OPERATION_PRIORITY_LABELS,
  canDeleteOperations,
  nextOperationStatus,
  previousOperationStatus,
} from '@/utils/permissions'
import type { OperationFormData } from '@/utils/operationExtras'
import type { Operation, OperationStatus } from '@/types/database'

type ViewMode = 'kanban' | 'tabela' | 'calendario'

const STATUS_DOT: Record<OperationStatus, string> = {
  DRAFT: 'bg-slate-500',
  SUBMITTED: 'bg-sky-400',
  ANALYSIS: 'bg-sky-400',
  PRODUCTION: 'bg-amber-400',
  REVIEW: 'bg-amber-400',
  CLIENT: 'bg-violet-400',
  APPROVED: 'bg-emerald-400',
  PUBLISHED: 'bg-emerald-400',
  DONE: 'bg-slate-600',
}

export function ProjectsPage() {
  const {
    operations,
    cardMeta,
    loading,
    createOperation,
    updateOperation,
    attachFiles,
    updateStatus,
    loadOperationDetails,
    archiveOperation,
  } = useOperations()
  const { clients } = useClients()
  const { requestApproval } = useApprovals()
  const { role, appUser } = useAuth()
  const { members } = useTeamMembers()
  const canDelete = canDeleteOperations(role, appUser)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingDetails, setEditingDetails] = useState<OperationDetails | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const handleCreate = async (form: OperationFormData, files: File[]) => {
    const { data, error } = await createOperation(form)
    if (error || !data) return { error: error ?? 'Erro ao criar' }
    if (files.length > 0) {
      const attach = await attachFiles(data.id, form.client_id, files)
      if (attach.error) return attach
    }
    return { error: null }
  }

  const handleUpdate = async (form: OperationFormData, files: File[]) => {
    if (!editingDetails) return { error: 'Operação não encontrada' }
    const result = await updateOperation(editingDetails.id, form)
    if (result.error) return result
    if (files.length > 0) {
      const attach = await attachFiles(editingDetails.id, editingDetails.client_id, files)
      if (attach.error) return attach
    }
    return { error: null }
  }

  const openEdit = async (operationId: string) => {
    setLoadingEdit(operationId)
    const details = await loadOperationDetails(operationId)
    setLoadingEdit(null)
    if (details) {
      setEditingDetails(details)
      setEditOpen(true)
    }
  }

  const advance = async (operationId: string, current: OperationStatus) => {
    const next = nextOperationStatus(current) as OperationStatus | null
    if (!next) return
    await updateStatus(operationId, next)
  }

  const revert = async (operationId: string, current: OperationStatus) => {
    const prev = previousOperationStatus(current) as OperationStatus | null
    if (!prev) return
    await updateStatus(operationId, prev)
  }

  const moveToStatus = async (operationId: string, toStatus: OperationStatus) => {
    const op = operations.find((o) => o.id === operationId)
    if (!op || op.status === toStatus) return
    setMovingId(operationId)
    await updateStatus(operationId, toStatus)
    setMovingId(null)
  }

  const handleColumnDragOver = (e: DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStatus !== status) setDragOverStatus(status)
  }

  const handleColumnDrop = async (e: DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault()
    const operationId = e.dataTransfer.getData('application/x-operation-id')
    setDragOverStatus(null)
    setDraggingId(null)
    if (!operationId) return
    await moveToStatus(operationId, status as OperationStatus)
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
          <p className="text-sm text-slate-400">
            Pipeline de produção — arraste os cards entre as colunas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
        >
          Solicitação
        </button>
      </header>

      <div className="mb-4 flex gap-1 border-b border-slate-800">
        {(
          [
            { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
            { key: 'tabela', label: 'Tabela', icon: Table2 },
            { key: 'calendario', label: 'Calendário', icon: CalendarDays },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewMode(key)}
            className={`flex min-h-10 items-center gap-1.5 rounded-t-lg px-3 text-sm ${
              viewMode === key
                ? 'bg-emerald-500/20 font-medium text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : viewMode === 'tabela' ? (
        <TableView
          operations={operations}
          members={members}
          onEdit={openEdit}
        />
      ) : viewMode === 'calendario' ? (
        <CalendarView operations={operations} onEdit={openEdit} />
      ) : (
        <div
          className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-5"
          onDragEnd={() => {
            setDraggingId(null)
            setDragOverStatus(null)
          }}
        >
          {byStatus.map(({ status, items }) => (
            <div
              key={status}
              onDragOver={(e) => handleColumnDragOver(e, status)}
              onDragLeave={() => {
                if (dragOverStatus === status) setDragOverStatus(null)
              }}
              onDrop={(e) => handleColumnDrop(e, status)}
              className={`w-[78vw] max-w-xs shrink-0 rounded-xl border p-3 transition sm:w-auto sm:max-w-none ${
                dragOverStatus === status
                  ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/30'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {OPERATION_STATUS_LABELS[status]} ({items.length})
              </h3>
              <ul className="min-h-16 space-y-2">
                {items.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-600">
                    {dragOverStatus === status ? 'Solte aqui' : 'Arraste um card'}
                  </li>
                )}
                {items.map((op) => {
                  const meta = cardMeta[op.id]
                  const prev = previousOperationStatus(op.status)
                  const responsible = members.find((m) => m.user_id === op.responsible_id)
                  return (
                    <OperationCard
                      key={op.id}
                      operation={op}
                      meta={meta?.meta}
                      hasDescription={meta?.hasDescription}
                      onEdit={() => openEdit(op.id)}
                      onAdvance={() => advance(op.id, op.status)}
                      onRevert={() => revert(op.id, op.status)}
                      onRequestApproval={(type) => handleRequestApproval(op.id, type)}
                      onDelete={() => archiveOperation(op.id)}
                      canDelete={canDelete}
                      requestingApproval={
                        requestingId === op.id ||
                        loadingEdit === op.id ||
                        movingId === op.id
                      }
                      canRevert={!!prev && op.status !== 'DRAFT'}
                      canAdvance={op.status !== 'DONE'}
                      isDragging={draggingId === op.id}
                      onDragBegin={() => setDraggingId(op.id)}
                      responsibleName={responsible?.user.name}
                    />
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <OperationModal
        mode="create"
        open={createOpen}
        clients={clients}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <OperationModal
        mode="edit"
        open={editOpen}
        clients={clients}
        initial={editingDetails}
        onClose={() => {
          setEditOpen(false)
          setEditingDetails(null)
        }}
        onSubmit={handleUpdate}
      />
    </div>
  )
}

function TableView({
  operations,
  members,
  onEdit,
}: {
  operations: Operation[]
  members: { user_id: string; user: { name: string } }[]
  onEdit: (id: string) => void
}) {
  if (operations.length === 0) {
    return <p className="text-slate-500">Nenhuma operação ainda.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Prazo</th>
            <th className="px-4 py-3">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => {
            const responsible = members.find((m) => m.user_id === op.responsible_id)
            return (
              <tr
                key={op.id}
                onClick={() => onEdit(op.id)}
                className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/60"
              >
                <td className="px-4 py-3 font-medium">{op.title}</td>
                <td className="px-4 py-3 text-slate-400">{op.clients?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[op.status]}`} />
                    {OPERATION_STATUS_LABELS[op.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {OPERATION_PRIORITY_LABELS[op.priority]}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {op.deadline ? new Date(op.deadline).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{responsible?.user.name ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CalendarView({
  operations,
  onEdit,
}: {
  operations: Operation[]
  onEdit: (id: string) => void
}) {
  const withDeadline = operations.filter((op) => op.deadline)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <MonthCalendar
        items={withDeadline}
        getKey={(op) => op.id}
        getDate={(op) => op.deadline}
        maxPerDay={3}
        renderItem={(op) => (
          <button
            type="button"
            onClick={() => onEdit(op.id)}
            title={`${op.title} — ${op.clients?.name ?? ''}`}
            className="flex w-full items-center gap-1 truncate rounded bg-slate-800/80 px-1 text-left text-[10px] text-slate-300 hover:bg-slate-700"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[op.status]}`} />
            <span className="truncate">{op.clients?.name ?? op.title}</span>
          </button>
        )}
      />
    </section>
  )
}
