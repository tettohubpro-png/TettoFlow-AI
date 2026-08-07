import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Plus, Trash2, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFinancialEntries } from '@/hooks/useFinancialEntries'
import { useCompanyBills, daysUntil, nextDueDateForDay } from '@/hooks/useCompanyBills'
import { useClients } from '@/hooks/useClients'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { canManageFinance, canViewFinance } from '@/utils/permissions'
import type { CompanyBill, CompanyBillKind, FinancialEntryStatus } from '@/types/database'

type TabKey = 'overview' | 'company' | 'employees' | 'entries'

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm'
const labelClass = 'block text-xs text-slate-500'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function urgencyLabel(days: number) {
  if (days < 0) return { text: `Atrasado ${Math.abs(days)}d`, className: 'text-red-300' }
  if (days === 0) return { text: 'Vence hoje', className: 'text-amber-300' }
  if (days <= 7) return { text: `Em ${days}d`, className: 'text-amber-300' }
  return { text: `Em ${days}d`, className: 'text-slate-400' }
}

export function FinancePage() {
  const { role } = useAuth()
  const canView = canViewFinance(role ?? undefined)
  const canManage = canManageFinance(role ?? undefined)
  const { entries, loading, error, createEntry, updateStatus } = useFinancialEntries()
  const {
    bills: companyBills,
    loading: loadingCompany,
    createBill,
    updateBill,
    deleteBill,
  } = useCompanyBills('company')
  const {
    bills: employeeBills,
    loading: loadingEmployees,
    createBill: createEmployeeBill,
    updateBill: updateEmployeeBill,
    deleteBill: deleteEmployeeBill,
  } = useCompanyBills('employee')
  const { clients } = useClients()
  const { members } = useTeamMembers()

  const [tab, setTab] = useState<TabKey>('overview')
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [showBillForm, setShowBillForm] = useState(false)
  const [billKind, setBillKind] = useState<CompanyBillKind>('company')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [entryForm, setEntryForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'other',
    description: '',
    amount: '',
    due_date: '',
    client_id: '',
  })

  const [billForm, setBillForm] = useState({
    name: '',
    amount: '',
    due_day: '10',
    notes: '',
    employee_user_id: '',
  })

  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)

  const upcomingBills = useMemo(() => {
    const all = [...companyBills, ...employeeBills].filter((b) => b.active)
    return all
      .map((b) => {
        const due = nextDueDateForDay(b.due_day)
        return { bill: b, due, days: daysUntil(due) }
      })
      .sort((a, b) => a.days - b.days)
  }, [companyBills, employeeBills])

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
    const companyMonth = companyBills.filter((b) => b.active).reduce((s, b) => s + Number(b.amount), 0)
    const payrollMonth = employeeBills.filter((b) => b.active).reduce((s, b) => s + Number(b.amount), 0)
    const dueSoon = upcomingBills.filter((u) => u.days <= 7).length
    return { incomeMonth, expenseMonth, pending, overdue, companyMonth, payrollMonth, dueSoon }
  }, [entries, currentMonth, today, companyBills, employeeBills, upcomingBills])

  const handleEntrySubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    if (!entryForm.description || !entryForm.amount || !entryForm.due_date) return
    setSaving(true)
    const result = await createEntry({
      type: entryForm.type,
      category: entryForm.category,
      description: entryForm.description,
      amount: Number(entryForm.amount),
      due_date: entryForm.due_date,
      client_id: entryForm.client_id || undefined,
    })
    setSaving(false)
    if (result.error) setFeedback(result.error)
    else {
      setShowEntryForm(false)
      setEntryForm({
        type: 'expense',
        category: 'other',
        description: '',
        amount: '',
        due_date: '',
        client_id: '',
      })
    }
  }

  const openBillForm = (kind: CompanyBillKind) => {
    setBillKind(kind)
    setBillForm({ name: '', amount: '', due_day: '10', notes: '', employee_user_id: '' })
    setShowBillForm(true)
    setTab(kind === 'company' ? 'company' : 'employees')
  }

  const handleBillSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    if (!billForm.name.trim() || !billForm.amount) return
    setSaving(true)
    const create = billKind === 'company' ? createBill : createEmployeeBill
    const result = await create({
      name: billForm.name,
      amount: Number(billForm.amount),
      due_day: Number(billForm.due_day) || 10,
      kind: billKind,
      notes: billForm.notes,
      employee_user_id: billForm.employee_user_id || null,
      category: billKind === 'employee' ? 'payroll' : 'subscription',
    })
    setSaving(false)
    if (result.error) setFeedback(result.error)
    else {
      setShowBillForm(false)
      setFeedback('Conta adicionada.')
    }
  }

  const markBillPaidThisMonth = async (bill: CompanyBill) => {
    if (!canManage) return
    const due = nextDueDateForDay(bill.due_day)
    const result = await createEntry({
      type: 'expense',
      category: bill.kind === 'employee' ? 'employee_payment' : 'company_bill',
      description: `${bill.name} (${due.slice(0, 7)})`,
      amount: Number(bill.amount),
      due_date: due,
    })
    if (result.error) {
      setFeedback(result.error)
      return
    }
    setFeedback(`Lançamento de "${bill.name}" criado. Marque como pago na aba Lançamentos quando pagar.`)
    setTab('entries')
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Você não tem permissão para ver o financeiro. Fale com o Master.
      </div>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Visão geral' },
    { key: 'company', label: 'Contas da empresa' },
    { key: 'employees', label: 'Pagamentos equipe' },
    { key: 'entries', label: 'Lançamentos' },
  ]

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Financeiro</h2>
          <p className="text-sm text-slate-400">
            Contas fixas, vencimentos e pagamentos de funcionários
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openBillForm(tab === 'employees' ? 'employee' : 'company')}
              className="min-h-11 rounded-lg border border-emerald-600/40 bg-emerald-600/15 px-4 py-2.5 text-sm text-emerald-300"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} /> Nova conta
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('entries')
                setShowEntryForm((v) => !v)
              }}
              className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500"
            >
              {showEntryForm ? 'Cancelar' : 'Novo lançamento'}
            </button>
          </div>
        )}
      </header>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-10 rounded-t-lg px-3 text-sm ${
              tab === t.key
                ? 'bg-emerald-500/20 font-medium text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <p className="mb-3 rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{feedback}</p>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Receita (mês)" value={formatBRL(totals.incomeMonth)} tone="emerald" />
            <StatCard label="Despesas lançadas (mês)" value={formatBRL(totals.expenseMonth)} tone="red" />
            <StatCard label="Contas empresa / mês" value={formatBRL(totals.companyMonth)} tone="amber" />
            <StatCard label="Folha equipe / mês" value={formatBRL(totals.payrollMonth)} tone="sky" />
          </div>

          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-300" />
              <h3 className="font-semibold text-slate-200">Próximos vencimentos</h3>
              <span className="text-xs text-slate-500">
                {totals.dueSoon} nos próximos 7 dias · {totals.overdue} lançamentos atrasados
              </span>
            </div>
            {upcomingBills.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conta ativa cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingBills.slice(0, 10).map(({ bill, due, days }) => {
                  const urg = urgencyLabel(days)
                  return (
                    <li
                      key={bill.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950/60 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {bill.name}
                          <span className="ml-2 text-xs text-slate-500">
                            {bill.kind === 'employee' ? 'Equipe' : 'Empresa'}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Vence {new Date(due + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${urg.className}`}>{urg.text}</span>
                        <span className="font-semibold text-emerald-300">{formatBRL(Number(bill.amount))}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === 'company' && (
        <BillsPanel
          title="Contas da empresa"
          subtitle="Aluguel, CapCut, Canva, Drive, Claude, Cursor e outras assinaturas"
          bills={companyBills}
          loading={loadingCompany}
          canManage={canManage}
          onToggle={(id, active) => updateBill(id, { active })}
          onDelete={deleteBill}
          onSaveAmount={(id, amount) => updateBill(id, { amount })}
          onSaveDueDay={(id, due_day) => updateBill(id, { due_day })}
          onMarkPaid={markBillPaidThisMonth}
        />
      )}

      {tab === 'employees' && (
        <BillsPanel
          title="Pagamentos de funcionários"
          subtitle="Folha e valores recorrentes da equipe — separado das contas da empresa"
          bills={employeeBills}
          loading={loadingEmployees}
          canManage={canManage}
          employeeMode
          onToggle={(id, active) => updateEmployeeBill(id, { active })}
          onDelete={deleteEmployeeBill}
          onSaveAmount={(id, amount) => updateEmployeeBill(id, { amount })}
          onSaveDueDay={(id, due_day) => updateEmployeeBill(id, { due_day })}
          onMarkPaid={markBillPaidThisMonth}
        />
      )}

      {canManage && showBillForm && (
        <form
          onSubmit={handleBillSubmit}
          className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 text-sm font-medium text-slate-300">
            Nova {billKind === 'employee' ? 'folha / pagamento' : 'conta da empresa'}
          </p>
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              required
              className={inputClass}
              value={billForm.name}
              onChange={(e) => setBillForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={billKind === 'employee' ? 'Ex.: Salário Ana' : 'Ex.: Notion'}
            />
          </div>
          <div>
            <label className={labelClass}>Valor mensal (R$) *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={billForm.amount}
              onChange={(e) => setBillForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Dia do vencimento (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              className={inputClass}
              value={billForm.due_day}
              onChange={(e) => setBillForm((f) => ({ ...f, due_day: e.target.value }))}
            />
          </div>
          {billKind === 'employee' && (
            <div>
              <label className={labelClass}>Funcionário (opcional)</label>
              <select
                className={inputClass}
                value={billForm.employee_user_id}
                onChange={(e) => setBillForm((f) => ({ ...f, employee_user_id: e.target.value }))}
              >
                <option value="">— sem vínculo —</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelClass}>Observações</label>
            <input
              className={inputClass}
              value={billForm.notes}
              onChange={(e) => setBillForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium disabled:opacity-50 sm:col-span-2 sm:w-auto"
          >
            {saving ? 'Salvando…' : 'Salvar conta'}
          </button>
        </form>
      )}

      {tab === 'entries' && (
        <>
          {!canManage && (
            <p className="mb-4 text-sm text-slate-400">
              Modo visualização: Gerente vê, só o Master altera.
            </p>
          )}

          {canManage && showEntryForm && (
            <form
              onSubmit={handleEntrySubmit}
              className="mb-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2"
            >
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={entryForm.type}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense' }))
                  }
                  className={inputClass}
                >
                  <option value="expense">Saída (despesa)</option>
                  <option value="income">Entrada (receita)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select
                  value={entryForm.category}
                  onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputClass}
                >
                  <option value="employee_payment">Pagamento de equipe</option>
                  <option value="company_bill">Conta da empresa</option>
                  <option value="client_contract">Contrato de cliente</option>
                  <option value="operational_cost">Custo operacional</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Descrição *</label>
                <input
                  required
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
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
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Vencimento *</label>
                <input
                  required
                  type="date"
                  value={entryForm.due_date}
                  onChange={(e) => setEntryForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Cliente (opcional)</label>
                <select
                  value={entryForm.client_id}
                  onChange={(e) => setEntryForm((f) => ({ ...f, client_id: e.target.value }))}
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

          {error && (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
            <h3 className="font-semibold text-slate-300">Lançamentos</h3>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : entries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nenhum lançamento ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    today={today}
                    canManage={canManage}
                    onUpdateStatus={updateStatus}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'red' | 'amber' | 'sky'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-400'
      : tone === 'red'
        ? 'text-red-400'
        : tone === 'amber'
          ? 'text-amber-300'
          : 'text-sky-300'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold sm:text-2xl ${toneClass}`}>{value}</p>
    </div>
  )
}

function BillsPanel({
  title,
  subtitle,
  bills,
  loading,
  canManage,
  employeeMode,
  onToggle,
  onDelete,
  onSaveAmount,
  onSaveDueDay,
  onMarkPaid,
}: {
  title: string
  subtitle: string
  bills: CompanyBill[]
  loading: boolean
  canManage: boolean
  employeeMode?: boolean
  onToggle: (id: string, active: boolean) => Promise<{ error: string | null }>
  onDelete: (id: string) => Promise<{ error: string | null }>
  onSaveAmount: (id: string, amount: number) => Promise<{ error: string | null }>
  onSaveDueDay: (id: string, due_day: number) => Promise<{ error: string | null }>
  onMarkPaid: (bill: CompanyBill) => void
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <h3 className="font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Carregando…</p>
      ) : bills.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nenhuma conta cadastrada ainda.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {bills.map((bill) => {
            const due = nextDueDateForDay(bill.due_day)
            const days = daysUntil(due)
            const urg = urgencyLabel(days)
            return (
              <li
                key={bill.id}
                className={`rounded-lg border px-3 py-3 ${
                  bill.active
                    ? 'border-slate-800 bg-slate-950/60'
                    : 'border-slate-800/50 bg-slate-950/30 opacity-60'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{bill.name}</p>
                    <p className="text-xs text-slate-500">
                      Dia {bill.due_day} · próximo {new Date(due + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {employeeMode && bill.users?.name ? ` · ${bill.users.name}` : ''}
                    </p>
                    {bill.notes && <p className="mt-1 text-xs text-slate-500">{bill.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs ${urg.className}`}>{urg.text}</span>
                    {canManage ? (
                      <>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={Number(bill.amount)}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (!Number.isNaN(v) && v !== Number(bill.amount)) onSaveAmount(bill.id, v)
                          }}
                          className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          title="Valor mensal"
                        />
                        <input
                          type="number"
                          min={1}
                          max={28}
                          defaultValue={bill.due_day}
                          onBlur={(e) => {
                            const v = Number(e.target.value)
                            if (!Number.isNaN(v) && v !== bill.due_day) onSaveDueDay(bill.id, v)
                          }}
                          className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          title="Dia vencimento"
                        />
                        <button
                          type="button"
                          onClick={() => onMarkPaid(bill)}
                          className="rounded-full bg-emerald-600/20 px-2.5 py-1 text-xs text-emerald-300"
                        >
                          Gerar lançamento
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggle(bill.id, !bill.active)}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {bill.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover ${bill.name}?`)) onDelete(bill.id)
                          }}
                          className="rounded p-1.5 text-slate-500 hover:text-red-400"
                          aria-label="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="font-semibold text-emerald-300">
                        {formatBRL(Number(bill.amount))}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function EntryRow({
  entry,
  today,
  canManage,
  onUpdateStatus,
}: {
  entry: {
    id: string
    description: string
    amount: number
    due_date: string
    type: 'income' | 'expense'
    status: FinancialEntryStatus
    category?: string
    clients?: { name: string }
  }
  today: string
  canManage: boolean
  onUpdateStatus: (id: string, status: FinancialEntryStatus) => void
}) {
  const overdue = entry.status === 'pending' && entry.due_date < today

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-slate-950/60 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-medium">{entry.description}</p>
        <p className="text-xs text-slate-500">
          {entry.clients?.name ? `${entry.clients.name} · ` : ''}
          {entry.category ? `${entry.category} · ` : ''}
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
        ) : canManage ? (
          <button
            type="button"
            onClick={() => onUpdateStatus(entry.id, 'paid')}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
              overdue ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            <Clock size={12} /> {overdue ? 'Atrasado' : 'Pendente'} · marcar pago
          </button>
        ) : (
          <span
            className={`flex items-center gap-1 text-xs ${
              overdue ? 'text-red-300' : 'text-amber-300'
            }`}
          >
            <Clock size={12} /> {overdue ? 'Atrasado' : 'Pendente'}
          </span>
        )}
      </div>
    </li>
  )
}
