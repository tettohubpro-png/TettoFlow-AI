import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { canManageClients, CLIENT_STATUS_LABELS } from '@/utils/permissions'
import { ONBOARDING_MARKER_TITLE } from '@/types/database'
import type { ClientStatus, ClientSocialLinks } from '@/types/database'

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm'
const labelClass = 'block text-xs text-slate-500'

export function CrmPage() {
  const { role, workspace, user } = useAuth()
  const { clients, loading, error, createClient, updateClient, fetchClients } = useClients()
  const { runs, running, lastResult, error: onboardingError, runOnboarding } = useOnboarding()
  const [showForm, setShowForm] = useState(false)
  const [formTab, setFormTab] = useState<'basico' | 'redes' | 'contrato'>('basico')
  const [runAfterCreate, setRunAfterCreate] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [onboardedIds, setOnboardedIds] = useState<Set<string>>(new Set())

  const emptyForm = {
    name: '',
    segment: '',
    cpfCnpj: '',
    city: '',
    state: '',
    origin: '',
    notes: '',
    whatsapp: '',
    email: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    facebook: '',
    linkedin: '',
    contractTitle: '',
    serviceDescription: '',
    monthlyValue: '',
    repetitions: '',
    periodicity: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    paymentMethod: '',
    startDate: '',
    firstBillingDate: '',
  }
  const [form, setForm] = useState(emptyForm)
  const setField = (field: keyof typeof emptyForm) => (
    e: { target: { value: string } },
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const canManage = canManageClients(role ?? undefined)

  useEffect(() => {
    if (clients.length === 0) return

    const ids = clients.map((c) => c.id)
    supabase
      .from('client_ai_memory')
      .select('client_id')
      .in('client_id', ids)
      .eq('title', ONBOARDING_MARKER_TITLE)
      .then(({ data }) => {
        setOnboardedIds(new Set((data ?? []).map((r) => r.client_id)))
      })
  }, [clients])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setActionError(null)
    setCreating(true)

    const socialLinks: ClientSocialLinks = {
      instagram: form.instagram || undefined,
      tiktok: form.tiktok || undefined,
      youtube: form.youtube || undefined,
      facebook: form.facebook || undefined,
      linkedin: form.linkedin || undefined,
    }

    const { data, error: err } = await createClient({
      name: form.name,
      status: 'ACTIVE',
      segment: form.segment,
      cpf_cnpj: form.cpfCnpj,
      city: form.city,
      state: form.state,
      origin: form.origin,
      notes: form.notes,
      social_links: socialLinks,
    })
    if (err || !data?.id) {
      setActionError(err ?? 'Falha ao criar cliente')
      setCreating(false)
      return
    }

    if ((form.whatsapp || form.email) && workspace?.id) {
      await supabase.from('client_contacts').insert({
        workspace_id: workspace.id,
        client_id: data.id,
        name: form.name,
        phone: form.whatsapp || null,
        email: form.email || null,
        is_primary: true,
      })
    }

    if (form.contractTitle.trim() && workspace?.id) {
      await supabase.from('client_contracts').insert({
        workspace_id: workspace.id,
        client_id: data.id,
        title: form.contractTitle,
        service_description: form.serviceDescription || null,
        monthly_value: form.monthlyValue ? Number(form.monthlyValue) : null,
        repetitions: form.repetitions ? Number(form.repetitions) : null,
        periodicity: form.periodicity,
        payment_method: form.paymentMethod || null,
        start_date: form.startDate || null,
        first_billing_date: form.firstBillingDate || null,
        created_by: user?.id ?? null,
      })
    }

    if (runAfterCreate) {
      const { error: obErr } = await runOnboarding(data.id)
      if (obErr) setActionError(obErr)
      else setOnboardedIds((prev) => new Set(prev).add(data.id))
    }

    setShowForm(false)
    setFormTab('basico')
    setForm(emptyForm)
    setCreating(false)
    await fetchClients()
  }

  const handleOnboarding = async (clientId: string) => {
    setActionError(null)
    const { error: err } = await runOnboarding(clientId)
    if (err) {
      setActionError(err)
      return
    }
    setOnboardedIds((prev) => new Set(prev).add(clientId))
    await fetchClients()
  }

  const handleActivate = async (clientId: string, withOnboarding: boolean) => {
    setActionError(null)
    await updateClient(clientId, { status: 'ACTIVE' as ClientStatus })
    if (withOnboarding) {
      await handleOnboarding(clientId)
    } else {
      await fetchClients()
    }
  }

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">CRM</h2>
          <p className="text-sm text-slate-400 sm:text-base">
            Clientes · Social Media responsável pelo onboard
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
          >
            {showForm ? 'Cancelar' : 'Novo cliente'}
          </button>
        )}
      </header>

      {(error || actionError || onboardingError) && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error || actionError || onboardingError}
        </p>
      )}

      {lastResult && !lastResult.alreadyDone && (
        <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Onboarding de <strong>{lastResult.clientName}</strong> concluído —{' '}
          {lastResult.operationsCreated} operações criadas.
        </p>
      )}

      {lastResult?.alreadyDone && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          {lastResult.clientName} já passou pelo onboarding.
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5"
        >
          <div className="mb-4 flex gap-1 border-b border-slate-800">
            {(['basico', 'redes', 'contrato'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFormTab(tab)}
                className={`min-h-10 rounded-t-lg px-3 text-sm capitalize ${
                  formTab === tab
                    ? 'bg-emerald-500/20 font-medium text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'basico' ? 'Básico' : tab === 'redes' ? 'Redes' : 'Contrato'}
              </button>
            ))}
          </div>

          {formTab === 'basico' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nome *</label>
                <input
                  required
                  placeholder="Ex: Empresa XYZ"
                  value={form.name}
                  onChange={setField('name')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Segmento / Nicho</label>
                <input
                  placeholder="Ex: Saúde e bem-estar"
                  value={form.segment}
                  onChange={setField('segment')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Origem do lead</label>
                <input
                  placeholder="Ex: WhatsApp, indicação, Instagram"
                  value={form.origin}
                  onChange={setField('origin')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={setField('whatsapp')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={form.email}
                  onChange={setField('email')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>CPF / CNPJ</label>
                <input
                  value={form.cpfCnpj}
                  onChange={setField('cpfCnpj')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cidade / Estado</label>
                <div className="flex gap-2">
                  <input
                    placeholder="Cidade"
                    value={form.city}
                    onChange={setField('city')}
                    className={inputClass}
                  />
                  <input
                    placeholder="UF"
                    maxLength={2}
                    value={form.state}
                    onChange={setField('state')}
                    className={`${inputClass} w-16 uppercase`}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notas internas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={setField('notes')}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {formTab === 'redes' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  placeholder="@usuario"
                  value={form.instagram}
                  onChange={setField('instagram')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>TikTok</label>
                <input
                  placeholder="@usuario"
                  value={form.tiktok}
                  onChange={setField('tiktok')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>YouTube</label>
                <input
                  placeholder="https://youtube.com/@canal"
                  value={form.youtube}
                  onChange={setField('youtube')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Facebook</label>
                <input
                  placeholder="https://facebook.com/pagina"
                  value={form.facebook}
                  onChange={setField('facebook')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input
                  placeholder="https://linkedin.com/company/..."
                  value={form.linkedin}
                  onChange={setField('linkedin')}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {formTab === 'contrato' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-xs text-slate-500 sm:col-span-2">
                Opcional — preencha valor, repetições e 1ª cobrança pra gerar as parcelas
                previstas automaticamente no Financeiro.
              </p>
              <div className="sm:col-span-2">
                <label className={labelClass}>Título do contrato</label>
                <input
                  placeholder="Ex: Contrato — Cliente"
                  value={form.contractTitle}
                  onChange={setField('contractTitle')}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Serviço contratado</label>
                <textarea
                  rows={2}
                  placeholder='Ex: "12 posts/mês + 1 vídeo"'
                  value={form.serviceDescription}
                  onChange={setField('serviceDescription')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Valor mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthlyValue}
                  onChange={setField('monthlyValue')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Qtd. repetições</label>
                <input
                  type="number"
                  min="1"
                  value={form.repetitions}
                  onChange={setField('repetitions')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Periodicidade</label>
                <select value={form.periodicity} onChange={setField('periodicity')} className={inputClass}>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Forma de pagamento</label>
                <input
                  placeholder="PIX, Boleto, Cartão..."
                  value={form.paymentMethod}
                  onChange={setField('paymentMethod')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Data de início</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={setField('startDate')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>1ª cobrança em</label>
                <input
                  type="date"
                  value={form.firstBillingDate}
                  onChange={setField('firstBillingDate')}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <label className="mt-4 flex min-h-11 items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={runAfterCreate}
              onChange={(e) => setRunAfterCreate(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Iniciar onboarding inteligente após criar
          </label>
          <button
            type="submit"
            disabled={running || creating}
            className="mt-2 min-h-11 w-full rounded-lg bg-emerald-600 px-6 py-2.5 font-medium disabled:opacity-50 sm:w-auto"
          >
            {running || creating ? 'Processando...' : 'Salvar cliente'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando clientes...</p>
      ) : clients.length === 0 ? (
        <p className="text-slate-500">Nenhum cliente cadastrado neste workspace.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {clients.map((c) => {
              const onboarded = onboardedIds.has(c.id)
              return (
                <article
                  key={c.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/crm/${c.id}`}
                      className="text-base font-semibold text-emerald-300"
                    >
                      {c.name}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-400">
                      {CLIENT_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Onboarding:{' '}
                    {onboarded ? (
                      <span className="text-emerald-400">Concluído</span>
                    ) : (
                      <span>Pendente</span>
                    )}{' '}
                    · {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/crm/${c.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg bg-sky-600/20 px-3 text-sm text-sky-300"
                    >
                      Briefing
                    </Link>
                    {canManage && !onboarded && c.status === 'ACTIVE' && (
                      <button
                        type="button"
                        disabled={running}
                        onClick={() => handleOnboarding(c.id)}
                        className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600/20 px-3 text-sm text-emerald-300 disabled:opacity-50"
                      >
                        Onboarding
                      </button>
                    )}
                    {canManage && c.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateClient(c.id, { status: 'INACTIVE' as ClientStatus })
                        }
                        className="inline-flex min-h-10 items-center rounded-lg bg-amber-600/20 px-3 text-sm text-amber-300"
                      >
                        Inativar
                      </button>
                    )}
                    {canManage && c.status === 'INACTIVE' && (
                      <>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => handleActivate(c.id, true)}
                          className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600/20 px-3 text-sm text-emerald-300 disabled:opacity-50"
                        >
                          Ativar + onboard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActivate(c.id, false)}
                          className="inline-flex min-h-10 items-center rounded-lg bg-slate-700/50 px-3 text-sm text-slate-300"
                        >
                          Só ativar
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Onboarding</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const onboarded = onboardedIds.has(c.id)
                  return (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to={`/crm/${c.id}`}
                          className="text-emerald-300 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {CLIENT_STATUS_LABELS[c.status] ?? c.status}
                      </td>
                      <td className="px-4 py-3">
                        {onboarded ? (
                          <span className="text-emerald-400">Concluído</span>
                        ) : (
                          <span className="text-slate-500">Pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="space-x-2 px-4 py-3">
                        <Link
                          to={`/crm/${c.id}`}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Abrir briefing
                        </Link>
                        {canManage && !onboarded && c.status === 'ACTIVE' && (
                          <button
                            type="button"
                            disabled={running}
                            onClick={() => handleOnboarding(c.id)}
                            className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                          >
                            Iniciar onboarding
                          </button>
                        )}
                        {canManage && c.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateClient(c.id, { status: 'INACTIVE' as ClientStatus })
                            }
                            className="text-xs text-amber-400 hover:underline"
                          >
                            Inativar
                          </button>
                        )}
                        {canManage && c.status === 'INACTIVE' && (
                          <>
                            <button
                              type="button"
                              disabled={running}
                              onClick={() => handleActivate(c.id, true)}
                              className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                            >
                              Ativar + onboarding
                            </button>
                            <button
                              type="button"
                              onClick={() => handleActivate(c.id, false)}
                              className="text-xs text-slate-400 hover:underline"
                            >
                              Só ativar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {runs.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="font-semibold text-slate-300">Últimas execuções de onboarding</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex flex-col gap-1 rounded-lg bg-slate-950/60 px-3 py-2 sm:flex-row sm:justify-between"
              >
                <span className="text-slate-400">
                  {new Date(run.created_at).toLocaleString('pt-BR')}
                </span>
                <span
                  className={
                    run.status === 'SUCCEEDED'
                      ? 'text-emerald-400'
                      : run.status === 'FAILED'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }
                >
                  {run.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
