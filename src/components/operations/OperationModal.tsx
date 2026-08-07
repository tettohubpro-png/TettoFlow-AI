import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { OperationDetails } from '@/hooks/useOperations'
import { useOperationComments } from '@/hooks/useOperationComments'
import type { ClientFile } from '@/types/database'
import {
  LABEL_PRESETS,
  emptyOperationForm,
  newId,
  type OperationFormData,
  type OperationLabel,
} from '@/utils/operationExtras'
import { openClientFile } from '@/utils/fileView'

type SectionKey = 'labels' | 'dates' | 'checklist' | 'attachments' | 'custom_fields'

interface OperationModalProps {
  mode: 'create' | 'edit'
  open: boolean
  clients: { id: string; name: string }[]
  initial?: OperationDetails | null
  onClose: () => void
  onSubmit: (form: OperationFormData, files: File[]) => Promise<{ error: string | null }>
}

export function OperationModal({
  mode,
  open,
  clients,
  initial,
  onClose,
  onSubmit,
}: OperationModalProps) {
  const [form, setForm] = useState<OperationFormData>(emptyOperationForm())
  const [sections, setSections] = useState<Set<SectionKey>>(new Set(['dates']))
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<ClientFile[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingFileId, setOpeningFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenFile = async (file: ClientFile) => {
    setOpeningFileId(file.id)
    setError(null)
    const result = await openClientFile(file)
    setOpeningFileId(null)
    if (result.error) setError(result.error)
  }

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && initial) {
      setForm({
        client_id: initial.client_id,
        title: initial.title,
        description: initial.description,
        start_date: initial.start_date?.slice(0, 10) ?? '',
        deadline: initial.deadline?.slice(0, 10) ?? '',
        labels: initial.meta.labels,
        checklist: initial.meta.checklist,
        custom_fields: initial.meta.custom_fields,
      })
      setExistingFiles(initial.files)
      const active = new Set<SectionKey>(['dates'])
      if (initial.meta.labels.length) active.add('labels')
      if (initial.meta.checklist.length) active.add('checklist')
      if (initial.meta.custom_fields.length) active.add('custom_fields')
      if (initial.description) active.add('dates')
      if (initial.files.length) active.add('attachments')
      setSections(active)
    } else {
      setForm(emptyOperationForm())
      setExistingFiles([])
      setSections(new Set(['dates']))
    }
    setPendingFiles([])
    setError(null)
    setAddMenuOpen(false)
  }, [open, mode, initial])

  if (!open) return null

  const toggleSection = (key: SectionKey) => {
    setSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setAddMenuOpen(false)
  }

  const addLabel = (preset: Omit<OperationLabel, 'id'>) => {
    if (form.labels.some((l) => l.name === preset.name)) return
    setForm({ ...form, labels: [...form.labels, { ...preset, id: newId() }] })
    setSections((s) => new Set(s).add('labels'))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await onSubmit(form, pendingFiles)
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  const addMenuItems: { key: SectionKey; title: string; desc: string; icon: string }[] = [
    { key: 'labels', title: 'Etiquetas', desc: 'Organize, categorize e priorize', icon: '🏷️' },
    { key: 'dates', title: 'Datas', desc: 'Datas de início, entrega e lembretes', icon: '🕐' },
    { key: 'checklist', title: 'Checklist', desc: 'Adicionar subtarefas', icon: '☑️' },
    { key: 'attachments', title: 'Anexo', desc: 'Adicione arquivos e links', icon: '📎' },
    {
      key: 'custom_fields',
      title: 'Campos personalizados',
      desc: 'Criar seus próprios campos',
      icon: '📋',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operation-modal-title"
      >
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex-1">
              {mode === 'create' && (
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Solicitação</p>
              )}
              <input
                id="operation-modal-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título da solicitação"
                className="w-full border-0 bg-transparent text-lg font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 sm:text-xl"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {mode === 'create' && (
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-slate-400">Cliente</span>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"
              >
                <option value="">Selecione o cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="relative mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
            >
              + Adicionar
            </button>
            {sections.has('checklist') && (
              <span className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
                ☑ Checklist
              </span>
            )}
            {sections.has('attachments') && (
              <span className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
                📎 Anexo
              </span>
            )}

            {addMenuOpen && (
              <div className="absolute left-0 top-10 z-10 w-72 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-xl">
                <p className="px-2 py-1 text-xs font-medium text-slate-400">Adicionar ao cartão</p>
                {addMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleSection(item.key)}
                    className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-800"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sections.has('labels') && (
            <section className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Etiquetas
              </h4>
              <div className="mb-2 flex flex-wrap gap-2">
                {form.labels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-slate-900"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          labels: form.labels.filter((l) => l.id !== label.id),
                        })
                      }
                      className="ml-1 opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LABEL_PRESETS.filter((p) => !form.labels.some((l) => l.name === p.name)).map(
                  (preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => addLabel(preset)}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-900"
                      style={{ backgroundColor: preset.color }}
                    >
                      + {preset.name}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {sections.has('dates') && (
            <section className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">Data inicial</span>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">Data de entrega</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                />
              </label>
            </section>
          )}

          <section className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Descrição
            </h4>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva a solicitação, briefing, referências..."
              rows={5}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </section>

          {sections.has('checklist') && (
            <section className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Checklist
              </h4>
              <ul className="space-y-2">
                {form.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() =>
                        setForm({
                          ...form,
                          checklist: form.checklist.map((c) =>
                            c.id === item.id ? { ...c, done: !c.done } : c,
                          ),
                        })
                      }
                      className="h-4 w-4 rounded border-slate-600"
                    />
                    <input
                      value={item.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          checklist: form.checklist.map((c) =>
                            c.id === item.id ? { ...c, text: e.target.value } : c,
                          ),
                        })
                      }
                      className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          checklist: form.checklist.filter((c) => c.id !== item.id),
                        })
                      }
                      className="text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    checklist: [...form.checklist, { id: newId(), text: '', done: false }],
                  })
                }
                className="mt-2 text-sm text-sky-400 hover:text-sky-300"
              >
                + Adicionar item
              </button>
            </section>
          )}

          {sections.has('attachments') && (
            <section className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Anexos
              </h4>
              {existingFiles.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm">
                  {existingFiles.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(f)}
                        disabled={openingFileId === f.id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline disabled:opacity-60"
                        title="Abrir anexo"
                      >
                        <span aria-hidden>📎</span>
                        <span className="truncate">
                          {openingFileId === f.id ? 'Abrindo…' : f.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pendingFiles.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm text-emerald-400">
                  {pendingFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`}>+ {f.name}</li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setPendingFiles(Array.from(e.target.files))
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300"
              >
                Escolher arquivos
              </button>
            </section>
          )}

          {sections.has('custom_fields') && (
            <section className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Campos personalizados
              </h4>
              <ul className="space-y-2">
                {form.custom_fields.map((field) => (
                  <li key={field.id} className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={field.label}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          custom_fields: form.custom_fields.map((f) =>
                            f.id === field.id ? { ...f, label: e.target.value } : f,
                          ),
                        })
                      }
                      placeholder="Nome do campo"
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        value={field.value}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            custom_fields: form.custom_fields.map((f) =>
                              f.id === field.id ? { ...f, value: e.target.value } : f,
                            ),
                          })
                        }
                        placeholder="Valor"
                        className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            custom_fields: form.custom_fields.filter((f) => f.id !== field.id),
                          })
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    custom_fields: [
                      ...form.custom_fields,
                      { id: newId(), label: '', value: '' },
                    ],
                  })
                }
                className="mt-2 text-sm text-sky-400 hover:text-sky-300"
              >
                + Adicionar campo
              </button>
            </section>
          )}

          {mode === 'edit' && initial?.id && <CommentsSection operationId={initial.id} />}

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 border-t border-slate-800 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : mode === 'create' ? 'Criar solicitação' : 'Salvar alterações'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CommentsSection({ operationId }: { operationId: string }) {
  const { comments, loading, addComment } = useOperationComments(operationId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSending(true)
    await addComment(text)
    setText('')
    setSending(false)
  }

  return (
    <section className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sugestões
      </h4>
      {loading && <p className="text-xs text-slate-600">Carregando...</p>}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-slate-600">Nenhuma sugestão ainda.</p>
      )}
      <ul className="mb-2 space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg bg-slate-900/60 px-3 py-2 text-sm">
            <p className="text-slate-200">{c.content}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {c.users?.name ?? 'Alguém'} ·{' '}
              {new Date(c.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Deixe uma sugestão pra equipe..."
          className="min-h-10 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={sending || !text.trim()}
          className="min-h-10 rounded-lg bg-emerald-600/20 px-3 text-sm text-emerald-300 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </section>
  )
}
