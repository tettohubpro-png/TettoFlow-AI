import { useState } from 'react'
import type { FormEvent } from 'react'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { canManageClients } from '@/utils/permissions'
import { SEGMENT_LABELS } from '@/utils/permissions'
import type { ClientSegment } from '@/types/database'

const segments: ClientSegment[] = ['general', 'legal', 'health_aesthetics', 'electoral']

export function CrmPage() {
  const { profile } = useAuth()
  const { clients, loading, createClient, updateClient } = useClients()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    segment: 'general' as ClientSegment,
    plan: '',
    monthly_fee: 0,
    status: 'prospect' as const,
    notes: '',
  })

  const canManage = canManageClients(profile?.role ?? 'client')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await createClient(form)
    if (!error) {
      setShowForm(false)
      setForm({
        name: '',
        segment: 'general',
        plan: '',
        monthly_fee: 0,
        status: 'prospect',
        notes: '',
      })
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM</h2>
          <p className="text-slate-400">Clientes, planos e contatos</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            {showForm ? 'Cancelar' : 'Novo cliente'}
          </button>
        )}
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:grid-cols-2"
        >
          <input
            placeholder="Nome do cliente"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <select
            value={form.segment}
            onChange={(e) =>
              setForm({ ...form, segment: e.target.value as ClientSegment })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {segments.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            placeholder="Plano"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <input
            type="number"
            placeholder="Mensalidade (R$)"
            value={form.monthly_fee}
            onChange={(e) =>
              setForm({ ...form, monthly_fee: Number(e.target.value) })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <textarea
            placeholder="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            rows={2}
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-emerald-600 py-2 font-medium"
          >
            Salvar cliente
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando clientes...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Mensalidade</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{SEGMENT_LABELS[c.segment]}</td>
                  <td className="px-4 py-3">{c.plan ?? '—'}</td>
                  <td className="px-4 py-3">
                    {Number(c.monthly_fee).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-4 py-3 capitalize">{c.status}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {c.status === 'prospect' && (
                        <button
                          type="button"
                          onClick={() => updateClient(c.id, { status: 'active' })}
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          Ativar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
