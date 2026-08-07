import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useClientBriefing } from '@/hooks/useClientBriefing'
import { useDriveUpload } from '@/hooks/useDriveUpload'
import { useFiles } from '@/hooks/useFiles'
import { useClientContracts } from '@/hooks/useClientContracts'
import { useOperations } from '@/hooks/useOperations'
import { DriveDropzone } from '@/components/files/DriveDropzone'
import {
  CLIENT_STATUS_LABELS,
  OPERATION_STATUS_ORDER,
  canEditBriefing,
  canUploadRecordings,
} from '@/utils/permissions'
import { buildDriveFolderName } from '@/utils/driveFolder'
import type { BriefingFormData, ContractPeriodicity } from '@/types/database'

type Tab = 'briefing' | 'gravacoes' | 'contrato' | 'visualizacao'

function formHasContent(form: BriefingFormData) {
  return Object.values(form).some((v) => String(v).trim().length > 0)
}

export function ClientBriefingPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { role, appUser } = useAuth()
  const {
    client,
    form,
    setForm,
    onboarded,
    loading,
    saving,
    error,
    saveBriefing,
    refresh,
  } = useClientBriefing(clientId)
  const { files, loading: filesLoading, refresh: refreshFiles } = useFiles(clientId)
  const { uploadFiles, uploading, progress, error: uploadError } = useDriveUpload(
    clientId,
    client?.name ?? 'Cliente',
  )

  const [tab, setTab] = useState<Tab>('briefing')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [shootDate, setShootDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [videomakerName, setVideomakerName] = useState(appUser?.name ?? '')

  const canEdit = canEditBriefing(role ?? undefined)
  const canUpload = canUploadRecordings(role ?? undefined)

  const folderPreview = useMemo(
    () => buildDriveFolderName(client?.name ?? 'Cliente', shootDate),
    [client?.name, shootDate],
  )

  const recordingFiles = files.filter(
    (f) =>
      f.storage_path.includes('drive.google.com') ||
      f.storage_path.startsWith('pending-drive/') ||
      f.name.startsWith('['),
  )

  // Só na 1ª carga: vazio → edição; com dados → travado. Não roda de novo ao digitar/salvar.
  useEffect(() => {
    if (loading || initialized) return
    setIsEditing(canEdit && !formHasContent(form))
    setInitialized(true)
  }, [loading, initialized, canEdit, form])

  const handleSave = async () => {
    if (!isEditing || saving) return
    setSavedMsg(null)
    const { error: err } = await saveBriefing()
    if (!err) {
      setSavedMsg('Briefing salvo com sucesso.')
      setIsEditing(false)
    }
  }

  const handleEdit = () => {
    if (saving) return
    setSavedMsg(null)
    setIsEditing(true)
  }

  const handleCancel = async () => {
    if (saving) return
    setSavedMsg(null)
    await refresh()
    setIsEditing(false)
  }

  const handleFiles = async (selected: File[]) => {
    await uploadFiles(selected, shootDate, videomakerName || appUser?.name || 'Videomaker')
    await refreshFiles()
  }

  if (loading || !initialized) {
    return <p className="text-slate-500">Carregando briefing...</p>
  }

  if (!client) {
    return (
      <div>
        <p className="text-red-400">{error ?? 'Cliente não encontrado'}</p>
        <Link to="/crm" className="mt-4 inline-block text-sm text-emerald-400">
          ← Voltar ao CRM
        </Link>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <Link
          to="/crm"
          className="inline-flex min-h-10 items-center text-sm text-slate-500 hover:text-emerald-400"
        >
          ← CRM
        </Link>
        <h2 className="mt-2 text-xl font-bold break-words sm:text-2xl">{client.name}</h2>
        <p className="text-sm text-slate-400">
          Onboard e briefing · Social Media responsável
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Onboarding: {onboarded ? 'Concluído' : 'Pendente'}
          {canEdit && tab === 'briefing'
            ? isEditing
              ? ' · Modo edição'
              : ' · Travado (seguro)'
            : ''}
        </p>
      </header>

      <div className="mb-4 flex gap-2 sm:mb-6">
        <button
          type="button"
          onClick={() => setTab('briefing')}
          className={`min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm sm:flex-none ${
            tab === 'briefing'
              ? 'bg-emerald-500/20 font-medium text-emerald-300'
              : 'bg-slate-900 text-slate-400'
          }`}
        >
          Briefing
        </button>
        <button
          type="button"
          onClick={() => setTab('gravacoes')}
          className={`min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm sm:flex-none ${
            tab === 'gravacoes'
              ? 'bg-emerald-500/20 font-medium text-emerald-300'
              : 'bg-slate-900 text-slate-400'
          }`}
        >
          Gravações
        </button>
        <button
          type="button"
          onClick={() => setTab('contrato')}
          className={`min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm sm:flex-none ${
            tab === 'contrato'
              ? 'bg-emerald-500/20 font-medium text-emerald-300'
              : 'bg-slate-900 text-slate-400'
          }`}
        >
          Contrato
        </button>
        <button
          type="button"
          onClick={() => setTab('visualizacao')}
          className={`min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm sm:flex-none ${
            tab === 'visualizacao'
              ? 'bg-emerald-500/20 font-medium text-emerald-300'
              : 'bg-slate-900 text-slate-400'
          }`}
        >
          Visualização
        </button>
      </div>

      {tab === 'briefing' && (
        <div className="space-y-6">
          {(error || savedMsg) && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                error
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {error || savedMsg}
            </p>
          )}

          {canEdit && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <button
                type="button"
                onClick={handleEdit}
                disabled={isEditing || saving}
                className="min-h-11 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Editar
              </button>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="min-h-11 rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isEditing || saving}
                  className="min-h-11 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-emerald-300">Identidade visual</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <UrlField
                label="Logo (URL)"
                value={form.logo_url}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, logo_url: v })}
                openLabel="Abrir pasta / logo"
              />
              <LockedField
                label="Fontes"
                value={form.fonts}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, fonts: v })}
              />
              <LockedField
                label="Cor primária"
                value={form.primary_color}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, primary_color: v })}
              />
              <LockedField
                label="Cor secundária"
                value={form.secondary_color}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, secondary_color: v })}
              />
              <div className="sm:col-span-2">
                <LockedField
                  label="Tom de voz"
                  value={form.tone_of_voice}
                  editing={isEditing && canEdit}
                  onChange={(v) => setForm({ ...form, tone_of_voice: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <LockedTextArea
                  label="Guidelines de marca"
                  value={form.guidelines}
                  editing={isEditing && canEdit}
                  onChange={(v) => setForm({ ...form, guidelines: v })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-violet-300">Briefing</h3>
            <div className="mt-4 space-y-3">
              <LockedTextArea
                label="História / sobre a empresa"
                value={form.history}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, history: v })}
                rows={4}
              />
              <LockedTextArea
                label="Objetivos de marketing"
                value={form.objectives}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, objectives: v })}
              />
              <LockedTextArea
                label="Persona / público"
                value={form.persona}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, persona: v })}
              />
              <LockedTextArea
                label="Restrições"
                value={form.constraints}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, constraints: v })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-sky-300">Produtos / serviços</h3>
            {isEditing && canEdit && (
              <p className="mt-1 text-xs text-slate-500">
                Um por linha. Formato: Nome ou Nome: descrição
              </p>
            )}
            <div className="mt-3">
              <LockedTextArea
                label=""
                value={form.productsText}
                editing={isEditing && canEdit}
                onChange={(v) => setForm({ ...form, productsText: v })}
                rows={4}
              />
            </div>
          </section>

          {canEdit && isEditing && (
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="min-h-12 rounded-lg border border-slate-700 px-6 py-3 text-slate-300 hover:bg-slate-900 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-12 rounded-lg bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}

          {!canEdit && (
            <p className="text-sm text-slate-500">
              Somente Social Media / gestores podem editar o briefing.
            </p>
          )}
        </div>
      )}

      {tab === 'gravacoes' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-emerald-300">Upload para Google Drive</h3>
            <p className="mt-1 text-sm text-slate-400">
              Pasta destino: <code className="text-emerald-400">{folderPreview}</code>
            </p>
            {(uploadError || !canUpload) && (
              <p className="mt-3 text-sm text-amber-400">
                {uploadError ||
                  'Sem permissão para upload. Solicite a um gestor ou videomaker.'}
              </p>
            )}
            <div className="mt-4">
              <DriveDropzone
                disabled={!canUpload}
                uploading={uploading}
                progress={progress}
                shootDate={shootDate}
                videomakerName={videomakerName}
                onShootDateChange={setShootDate}
                onVideomakerChange={setVideomakerName}
                onFiles={handleFiles}
              />
            </div>
            {progress.some((p) => p.driveUrl) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {progress
                  .filter((p) => p.driveUrl)
                  .map((p) => (
                    <a
                      key={`${p.fileName}-${p.driveUrl}`}
                      href={p.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Abrir {p.fileName} ↗
                    </a>
                  ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-slate-300">Arquivos deste cliente</h3>
            {filesLoading ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : recordingFiles.length === 0 && files.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nenhum arquivo ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(recordingFiles.length > 0 ? recordingFiles : files).map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-col gap-2 rounded-lg bg-slate-950/60 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-words">{f.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(f.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {f.storage_path.startsWith('http') ? (
                      <a
                        href={f.storage_path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        Abrir documento ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">{f.mime_type ?? 'arquivo'}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'contrato' && <ContractsTab clientId={clientId} canEdit={canEdit} />}

      {tab === 'visualizacao' && (
        <VisualizacaoTab
          clientId={clientId}
          clientName={client?.name ?? ''}
          clientStatus={client?.status}
          logoUrl={form.logo_url}
        />
      )}
    </div>
  )
}

function VisualizacaoTab({
  clientId,
  clientName,
  clientStatus,
  logoUrl,
}: {
  clientId: string | undefined
  clientName: string
  clientStatus: string | undefined
  logoUrl: string
}) {
  const { operations } = useOperations(clientId)

  const counts = OPERATION_STATUS_ORDER.reduce<Record<string, number>>((acc, status) => {
    acc[status] = operations.filter((op) => op.status === status).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="font-semibold text-slate-300">Controle de visibilidade</h3>
        <p className="mt-2 text-sm text-slate-500">
          Por padrão, todos os membros do workspace com acesso ao CRM veem este cliente.
          Restringir a visibilidade a membros específicos depende da hierarquia de papéis
          (proprietário/gerente/funcionário/estagiário) — ainda não implementada neste
          sistema. Assim que existir, esse controle aparece aqui.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="mb-3 font-semibold text-slate-300">Prévia do cartão</h3>
        <div className="max-w-xs overflow-hidden rounded-xl border border-slate-800">
          <div className="flex h-20 items-center justify-center bg-slate-800">
            {logoUrl ? (
              <img src={logoUrl} alt={clientName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">🏢</span>
            )}
          </div>
          <div className="bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{clientName || 'Nome do Cliente'}</p>
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
                {clientStatus ? (CLIENT_STATUS_LABELS[clientStatus] ?? clientStatus) : '—'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
              <span>{counts.DRAFT ?? 0} rascunho</span>
              <span>{counts.REVIEW ?? 0} em revisão</span>
              <span>{(counts.APPROVED ?? 0) + (counts.PUBLISHED ?? 0)} aprovados</span>
              <span>{counts.DONE ?? 0} concluídos</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ContractsTab({ clientId, canEdit }: { clientId: string | undefined; canEdit: boolean }) {
  const { contracts, loading, error, createContract } = useClientContracts(clientId)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    serviceDescription: '',
    monthlyValue: '',
    repetitions: '',
    periodicity: 'monthly' as ContractPeriodicity,
    paymentMethod: '',
    startDate: '',
    firstBillingDate: '',
    fileUrl: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await createContract({
      title: form.title,
      service_description: form.serviceDescription || undefined,
      monthly_value: form.monthlyValue ? Number(form.monthlyValue) : undefined,
      repetitions: form.repetitions ? Number(form.repetitions) : undefined,
      periodicity: form.periodicity,
      payment_method: form.paymentMethod || undefined,
      start_date: form.startDate || undefined,
      first_billing_date: form.firstBillingDate || undefined,
      file_url: form.fileUrl || undefined,
    })
    setSaving(false)
    setShowForm(false)
    setForm({
      title: '',
      serviceDescription: '',
      monthlyValue: '',
      repetitions: '',
      periodicity: 'monthly',
      paymentMethod: '',
      startDate: '',
      firstBillingDate: '',
      fileUrl: '',
    })
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500"
          >
            {showForm ? 'Cancelar' : 'Novo contrato'}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-2"
        >
          <p className="text-xs text-slate-500 sm:col-span-2">
            Preencha valor, repetições e 1ª cobrança pra gerar as parcelas automaticamente no
            Financeiro.
          </p>
          <div className="sm:col-span-2">
            <label className={labelClass}>Título do contrato *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Serviço contratado</label>
            <textarea
              rows={2}
              placeholder='Ex: "12 posts/mês + 1 vídeo"'
              value={form.serviceDescription}
              onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, monthlyValue: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Qtd. repetições</label>
            <input
              type="number"
              min="1"
              value={form.repetitions}
              onChange={(e) => setForm((f) => ({ ...f, repetitions: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Periodicidade</label>
            <select
              value={form.periodicity}
              onChange={(e) =>
                setForm((f) => ({ ...f, periodicity: e.target.value as ContractPeriodicity }))
              }
              className={inputClass}
            >
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
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data de início</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>1ª cobrança em</label>
            <input
              type="date"
              value={form.firstBillingDate}
              onChange={(e) => setForm((f) => ({ ...f, firstBillingDate: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>URL do arquivo do contrato</label>
            <input
              value={form.fileUrl}
              onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium disabled:opacity-50 sm:col-span-2 sm:w-auto"
          >
            {saving ? 'Salvando...' : 'Salvar contrato'}
          </button>
        </form>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="font-semibold text-slate-300">Contratos deste cliente</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Carregando...</p>
        ) : contracts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {contracts.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-950/60 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{c.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {c.status === 'active' ? 'Ativo' : c.status === 'paused' ? 'Pausado' : 'Encerrado'}
                  </span>
                </div>
                {c.service_description && (
                  <p className="mt-1 text-xs text-slate-500">{c.service_description}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {c.monthly_value != null &&
                    `R$ ${c.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · `}
                  {c.repetitions && `${c.repetitions}x `}
                  {c.periodicity === 'monthly' ? 'mensal' : c.periodicity === 'weekly' ? 'semanal' : 'anual'}
                  {c.payment_method && ` · ${c.payment_method}`}
                </p>
                {c.file_url && (
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-emerald-300 hover:underline"
                  >
                    Ver arquivo do contrato ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm'
const labelClass = 'block text-xs text-slate-500'

function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function LockedField({
  label,
  value,
  onChange,
  editing,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
}) {
  return (
    <div className="block text-sm">
      {label && <span className="mb-1 block text-slate-400">{label}</span>}
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        />
      ) : (
        <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200">
          {value.trim() || <span className="text-slate-600">Não informado</span>}
        </p>
      )}
    </div>
  )
}

function UrlField({
  label,
  value,
  onChange,
  editing,
  openLabel = 'Abrir link',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  openLabel?: string
}) {
  const href = value.trim()
  const canOpen = isHttpUrl(href)

  return (
    <div className="block text-sm">
      {label && <span className="mb-1 block text-slate-400">{label}</span>}
      {editing ? (
        <>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Evita que Enter dispare salvamento acidental
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder="https://drive.google.com/..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          {value.trim() && !canOpen && (
            <p className="mt-2 text-xs text-amber-400/90">
              Informe uma URL completa (começando com https://).
            </p>
          )}
        </>
      ) : canOpen ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 sm:w-auto"
        >
          {openLabel}
          <span aria-hidden>↗</span>
        </a>
      ) : (
        <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-600">
          Nenhum link cadastrado
        </p>
      )}
    </div>
  )
}

function LockedTextArea({
  label,
  value,
  onChange,
  editing,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  rows?: number
}) {
  return (
    <div className="block text-sm">
      {label && <span className="mb-1 block text-slate-400">{label}</span>}
      {editing ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        />
      ) : (
        <p className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200">
          {value.trim() || <span className="text-slate-600">Não informado</span>}
        </p>
      )}
    </div>
  )
}
