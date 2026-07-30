import { useState } from 'react'
import type { FormEvent } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  nextProjectStatus,
} from '@/utils/permissions'
import type { ProjectStatus } from '@/types/database'

export function ProjectsPage() {
  const { projects, loading, createProject, updateStatus } = useProjects()
  const { clients } = useClients()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', title: '', description: '' })

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await createProject(form)
    if (!error) {
      setShowForm(false)
      setForm({ client_id: '', title: '', description: '' })
    }
  }

  const advance = async (projectId: string, current: ProjectStatus) => {
    const next = nextProjectStatus(current) as ProjectStatus | null
    if (!next) return
    await updateStatus(projectId, next, current)
  }

  const byStatus = PROJECT_STATUS_ORDER.map((status) => ({
    status,
    items: projects.filter((p) => p.status === status),
  }))

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projetos</h2>
          <p className="text-slate-400">Pipeline de produção</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          {showForm ? 'Cancelar' : 'Novo projeto'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:grid-cols-2"
        >
          <select
            required
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
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
            placeholder="Título do projeto"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            rows={2}
          />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-emerald-600 py-2">
            Criar projeto
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="grid gap-4 overflow-x-auto lg:grid-cols-3 xl:grid-cols-6">
          {byStatus.map(({ status, items }) => (
            <div
              key={status}
              className="min-w-[200px] rounded-xl border border-slate-800 bg-slate-900/30 p-3"
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {PROJECT_STATUS_LABELS[status]} ({items.length})
              </h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
                  >
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{p.clients?.name}</p>
                    {status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => advance(p.id, p.status)}
                        className="mt-2 text-xs text-emerald-400 hover:underline"
                      >
                        Avançar →
                      </button>
                    )}
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
