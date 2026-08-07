import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFinancialEntries } from '@/hooks/useFinancialEntries'
import { useClients } from '@/hooks/useClients'
import { canManageFinance } from '@/utils/permissions'
import type { FinancialEntryStatus } from '@/types/database'

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm'
const labelClass = 'block text-xs text-slate-500'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinancePage() {
  const { role } = useAuth()
  const canManage = canManageFinance(role ?? undefined)
  const { entries, loading, error, createEntry, updateStatus } = useFinancialEntries()
  const { clients } = useClients()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'employee_payment',
    description: '',
    amount: '',
    due_date: '',
    client_id: '',
  })

  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)

  const totals = useMemo(() => {
    let incomeMonth = 0
    let expenseMonth = 0
    let pending = 0
    let overdue = 0
    for (const e of entries) {
      const isThisMonth = e.due_date.startsWith(currentMonth)
      if (isThisMonth && e.status !== 'cancelled') {
        if (e.type === 'income') incomeMonth += e.amount
        else expenseMonth += e.amount
      }
      if (e.status === 'pending') {
        pending += 1
        if (e.due_date < today) overdue += 1
      }
    }
    return { incomeMonth, expenseMonth, pending, overdue }
  }, [entries, currentMonth, today])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount || !form.due_date) return
    setSaving(true)
    await createEntry({
      type: form.type,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      due_date: form.due_date,
      client_id: form.client_id || undefined,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ type: 'expense', category: 'employee_payment', description: '', amount: '', due_date: '', client_id: '' })
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Você não tem permissão para ver o financeiro. Fale com um gestor/proprietário.
      </div>
    )
  }

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Financeiro</h2>
          <p className="text-sm text-slate-400 sm:text-base">
            Entradas de contratos + lançamentos manuais (equipe, despesas)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
        >
          {showForm ? 'Cancelar' : 'Novo lançamento'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Receita prevista (mês)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {formatBRL(totals.incomeMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Despesas (mês)</p>
          <p className="mt-2 text-2xl font-bold text-red-400">
            {formatBRL(totals.expenseMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Pendentes</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">{totals.pending}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Atrasados</p>
          <p className="mt-2 text-2xl font-bold text-red-400">{totals.overdue}</p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2"
        >
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
              className={inputClass}
            >
              <option value="expense">Saída (despesa)</option>
              <option value="income">Entrada (receita)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            >
              <option value="employee_payment">Pagamento de equipe</option>
              <option value="client_contract">Contrato de cliente</option>
              <option value="operational_cost">Custo operacional</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição *</label>
            <input
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Valor (R$) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vencimento *</label>
            <input
              required
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Cliente (opcional)</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">— nenhum —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium disabled:opacity-50 sm:col-span-2 sm:w-auto"
          >
            {saving ? 'Salvando...' : 'Salvar lançamento'}
          </button>
        </form>
      )}

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <h3 className="font-semibold text-slate-300">Lançamentos</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhum lançamento ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} today={today} onUpdateStatus={updateStatus} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function EntryRow({
  entry,
  today,
  onUpdateStatus,
}: {
  entry: {
    id: string
    description: string
    amount: number
    due_date: string
    type: 'income' | 'expense'
    status: FinancialEntryStatus
    clients?: { name: string }
  }
  today: string
  onUpdateStatus: (id: string, status: FinancialEntryStatus) => void
}) {
  const overdue = entry.status === 'pending' && entry.due_date < today

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-slate-950/60 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-medium">{entry.description}</p>
        <p className="text-xs text-slate-500">
          {entry.clients?.name ? `${entry.clients.name} · ` : ''}
          {new Date(entry.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>
          {entry.type === 'income' ? '+' : '−'} {formatBRL(entry.amount)}
        </span>
        {entry.status === 'paid' ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 size={14} /> Pago
          </span>
        ) : entry.status === 'cancelled' ? (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <XCircle size={14} /> Cancelado
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onUpdateStatus(entry.id, 'paid')}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
              overdue ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            <Clock size={12} /> {overdue ? 'Atrasado' : 'Pendente'} · marcar pago
          </button>
        )}
      </div>
    </li>
  )
}
