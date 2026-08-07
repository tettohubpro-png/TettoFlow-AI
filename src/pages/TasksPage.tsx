import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  useTasks,
  TASK_STATUS_ORDER,
  TASK_STATUS_LABELS,
  type TaskStatus,
  type TaskPriority,
} from '@/hooks/useTasks'
import { useOperations } from '@/hooks/useOperations'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { OPERATION_PRIORITY_LABELS } from '@/utils/permissions'

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm'
const labelClass = 'block text-xs text-slate-500'

const PRIORITY_DOT: Record<TaskPriority, string> = {
  LOW: 'bg-slate-500',
  MEDIUM: 'bg-sky-400',
  HIGH: 'bg-amber-400',
  CRITICAL: 'bg-red-400',
}

export function TasksPage() {
  const { tasks, loading, createTask, updateStatus, deleteTask } = useTasks()
  const { operations } = useOperations()
  const { members } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'backlog' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    operation_id: '',
    assignee_id: '',
    due_date: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await createTask({
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      operation_id: form.operation_id || undefined,
      assignee_id: form.assignee_id || undefined,
      due_date: form.due_date || undefined,
    })
    setSaving(false)
    setShowForm(false)
    setForm({
      title: '',
      description: '',
      status: 'backlog',
      priority: 'MEDIUM',
      operation_id: '',
      assignee_id: '',
      due_date: '',
    })
  }

  const byStatus = TASK_STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  }))

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Tarefas</h2>
          <p className="text-sm text-slate-400">
            {tasks.length} tarefas · {tasks.filter((t) => t.status === 'done').length} concluídas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Nova tarefa'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className={labelClass}>Título *</label>
            <input
              required
              placeholder="Descreva a tarefa..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição</label>
            <textarea
              rows={2}
              placeholder="Detalhes opcionais..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              className={inputClass}
            >
              {TASK_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prioridade</label>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
              }
              className={inputClass}
            >
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                <option key={p} value={p}>
                  {OPERATION_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Projeto (opcional)</label>
            <select
              value={form.operation_id}
              onChange={(e) => setForm((f) => ({ ...f, operation_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Nenhum</option>
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Responsável</label>
            <select
              value={form.assignee_id}
              onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Nenhum</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium disabled:opacity-50 sm:col-span-2 sm:w-auto"
          >
            {saving ? 'Salvando...' : 'Criar tarefa'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {byStatus.map(({ status, items }) => (
            <div
              key={status}
              className="w-[78vw] max-w-xs shrink-0 rounded-xl border border-slate-800 bg-slate-900/30 p-3 sm:w-auto sm:max-w-none"
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {TASK_STATUS_LABELS[status]} ({items.length})
              </h3>
              <ul className="min-h-16 space-y-2">
                {items.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-600">
                    Vazio
                  </li>
                )}
                {items.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-1.5 break-words font-medium">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                        />
                        {task.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="shrink-0 text-slate-600 hover:text-red-400"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {task.assignee?.name && <span>{task.assignee.name}</span>}
                      {task.due_date && (
                        <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                      )}
                      {task.operations?.title && (
                        <span className="truncate text-sky-400">{task.operations.title}</span>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                      className="mt-2 min-h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
                    >
                      {TASK_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {TASK_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
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
