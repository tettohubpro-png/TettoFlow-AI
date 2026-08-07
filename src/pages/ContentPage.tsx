import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Pencil } from 'lucide-react'
import { PostCalendar } from '@/components/dashboard/PostCalendar'
import { OperationModal } from '@/components/operations/OperationModal'
import { useOperations, type OperationDetails } from '@/hooks/useOperations'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { canOperateTasks } from '@/utils/permissions'
import { downloadClientFile, openClientFile } from '@/utils/fileView'
import type { OperationFormData } from '@/utils/operationExtras'
import type { ClientFile, Operation } from '@/types/database'

export function ContentPage() {
  const {
    operations,
    loading,
    updateOperation,
    attachFiles,
    loadOperationDetails,
  } = useOperations()
  const { clients } = useClients()
  const { role } = useAuth()
  const canOperate = canOperateTasks(role)

  const [editOpen, setEditOpen] = useState(false)
  const [editingDetails, setEditingDetails] = useState<OperationDetails | null>(null)
  const [selected, setSelected] = useState<OperationDetails | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyFileId, setBusyFileId] = useState<string | null>(null)

  const contentOps = useMemo(
    () =>
      operations.filter((op) => {
        const title = op.title.toLowerCase()
        return (
          /post|conte[uú]do|reels|stories|instagram|calend[aá]rio|feed|carrossel/i.test(title) ||
          op.status === 'APPROVED' ||
          op.status === 'PUBLISHED' ||
          op.status === 'REVIEW' ||
          op.status === 'CLIENT'
        )
      }),
    [operations],
  )

  const openDetails = async (op: Operation) => {
    setActionError(null)
    const details = await loadOperationDetails(op.id)
    setSelected(details)
  }

  const openEdit = async (operationId: string) => {
    const details = await loadOperationDetails(operationId)
    if (!details) return
    setEditingDetails(details)
    setEditOpen(true)
  }

  const handleUpdate = async (form: OperationFormData, files: File[]) => {
    if (!canOperate) return { error: 'Sem permissão para editar' }
    if (!editingDetails) return { error: 'Operação não encontrada' }
    const result = await updateOperation(editingDetails.id, form)
    if (result.error) return result
    if (files.length > 0) {
      const attach = await attachFiles(editingDetails.id, editingDetails.client_id, files)
      if (attach.error) return attach
    }
    const refreshed = await loadOperationDetails(editingDetails.id)
    setSelected(refreshed)
    return { error: null }
  }

  const handleOpenFile = async (file: ClientFile) => {
    setBusyFileId(file.id)
    setActionError(null)
    const result = await openClientFile(file)
    if (result.error) setActionError(result.error)
    setBusyFileId(null)
  }

  const handleDownloadFile = async (file: ClientFile) => {
    setBusyFileId(file.id)
    setActionError(null)
    const result = await downloadClientFile(file)
    if (result.error) setActionError(result.error)
    setBusyFileId(null)
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2 className="tf-title text-xl sm:text-2xl">Conteúdo</h2>
          <p className="tf-subtitle mt-1">
            Calendário editorial — clique no post para editar, baixar ou abrir na operação
          </p>
        </div>
        <Link to="/tarefas" className="tf-btn tf-btn-ghost text-sm">
          Ir para Tarefas (Kanban)
        </Link>
      </header>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          Carregando…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <PostCalendar
            operations={contentOps.length ? contentOps : operations}
            onSelect={openDetails}
            selectedId={selected?.id}
          />

          <aside className="tf-panel h-fit p-4">
            <h3 className="text-sm font-semibold">Postagem selecionada</h3>
            {!selected ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text3)' }}>
                Selecione um item no calendário para editar a data, baixar o post ou abrir a
                operação.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-medium">{selected.title}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                    {selected.clients?.name ?? 'Sem cliente'}
                    {selected.deadline
                      ? ` · ${new Date(selected.deadline).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {canOperate && (
                    <button
                      type="button"
                      onClick={() => openEdit(selected.id)}
                      className="tf-btn tf-btn-primary inline-flex items-center justify-center gap-1.5 text-sm"
                    >
                      <Pencil size={14} /> Editar postagem / data
                    </button>
                  )}
                  <Link
                    to={`/tarefas?op=${selected.id}`}
                    className="tf-btn tf-btn-ghost inline-flex items-center justify-center gap-1.5 text-sm"
                  >
                    <ExternalLink size={14} /> Abrir em Tarefas
                  </Link>
                </div>

                <div>
                  <p className="tf-label">Arquivos / posts</p>
                  {selected.files.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                      Nenhum anexo. Edite a operação para enviar o arquivo do post.
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1.5">
                      {selected.files.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              disabled={busyFileId === file.id}
                              onClick={() => handleOpenFile(file)}
                              className="rounded px-1.5 py-0.5 hover:bg-white/5"
                              title="Abrir"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              disabled={busyFileId === file.id}
                              onClick={() => handleDownloadFile(file)}
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-white/5"
                              title="Baixar"
                            >
                              <Download size={12} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {actionError && (
                  <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
                    {actionError}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

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
