import { useState } from 'react'
import type { DragEvent } from 'react'
import { OperationCard } from '@/components/operations/OperationCard'
import { OperationModal } from '@/components/operations/OperationModal'
import { useOperations, type OperationDetails } from '@/hooks/useOperations'
import { useClients } from '@/hooks/useClients'
import { useApprovals } from '@/hooks/useApprovals'
import {
  OPERATION_STATUS_LABELS,
  OPERATION_STATUS_ORDER,
  nextOperationStatus,
  previousOperationStatus,
} from '@/utils/permissions'
import type { OperationFormData } from '@/utils/operationExtras'
import type { OperationStatus } from '@/types/database'

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
  } = useOperations()
  const { clients } = useClients()
  const { requestApproval } = useApprovals()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingDetails, setEditingDetails] = useState<OperationDetails | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

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

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
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
                      requestingApproval={
                        requestingId === op.id ||
                        loadingEdit === op.id ||
                        movingId === op.id
                      }
                      canRevert={!!prev && op.status !== 'DRAFT'}
                      canAdvance={op.status !== 'DONE'}
                      isDragging={draggingId === op.id}
                      onDragBegin={() => setDraggingId(op.id)}
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
