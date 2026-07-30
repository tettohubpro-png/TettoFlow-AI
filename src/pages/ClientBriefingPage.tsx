import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useClientBriefing } from '@/hooks/useClientBriefing'
import { useDriveUpload } from '@/hooks/useDriveUpload'
import { useFiles } from '@/hooks/useFiles'
import { DriveDropzone } from '@/components/files/DriveDropzone'
import { canEditBriefing, canUploadRecordings } from '@/utils/permissions'
import { buildDriveFolderName } from '@/utils/driveFolder'

type Tab = 'briefing' | 'gravacoes'

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
  } = useClientBriefing(clientId)
  const { files, loading: filesLoading, refresh: refreshFiles } = useFiles(clientId)
  const { uploadFiles, uploading, progress, error: uploadError } = useDriveUpload(
    clientId,
    client?.name ?? 'Cliente',
  )

  const [tab, setTab] = useState<Tab>('briefing')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSavedMsg(null)
    const { error: err } = await saveBriefing()
    if (!err) setSavedMsg('Briefing salvo com sucesso.')
  }

  const handleFiles = async (selected: File[]) => {
    await uploadFiles(selected, shootDate, videomakerName || appUser?.name || 'Videomaker')
    await refreshFiles()
  }

  if (loading) {
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
      </div>

      {tab === 'briefing' && (
        <form onSubmit={handleSave} className="space-y-6">
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

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-emerald-300">Identidade visual</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                label="Logo (URL)"
                value={form.logo_url}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, logo_url: v })}
              />
              <Field
                label="Fontes"
                value={form.fonts}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, fonts: v })}
              />
              <Field
                label="Cor primária"
                value={form.primary_color}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, primary_color: v })}
              />
              <Field
                label="Cor secundária"
                value={form.secondary_color}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, secondary_color: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Tom de voz"
                  value={form.tone_of_voice}
                  disabled={!canEdit}
                  onChange={(v) => setForm({ ...form, tone_of_voice: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <TextArea
                  label="Guidelines de marca"
                  value={form.guidelines}
                  disabled={!canEdit}
                  onChange={(v) => setForm({ ...form, guidelines: v })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-violet-300">Briefing</h3>
            <div className="mt-4 space-y-3">
              <TextArea
                label="História / sobre a empresa"
                value={form.history}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, history: v })}
                rows={4}
              />
              <TextArea
                label="Objetivos de marketing"
                value={form.objectives}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, objectives: v })}
              />
              <TextArea
                label="Persona / público"
                value={form.persona}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, persona: v })}
              />
              <TextArea
                label="Restrições"
                value={form.constraints}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, constraints: v })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-sky-300">Produtos / serviços</h3>
            <p className="mt-1 text-xs text-slate-500">
              Um por linha. Formato: Nome ou Nome: descrição
            </p>
            <div className="mt-3">
              <TextArea
                label=""
                value={form.productsText}
                disabled={!canEdit}
                onChange={(v) => setForm({ ...form, productsText: v })}
                rows={4}
              />
            </div>
          </section>

          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Salvar briefing'}
            </button>
          )}
          {!canEdit && (
            <p className="text-sm text-slate-500">
              Somente Social Media / gestores podem editar o briefing.
            </p>
          )}
        </form>
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
                    className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(f.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {f.storage_path.startsWith('http') ? (
                      <a
                        href={f.storage_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Abrir
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
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block text-slate-400">{label}</span>}
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-60"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  rows?: number
}) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block text-slate-400">{label}</span>}
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 disabled:opacity-60"
      />
    </label>
  )
}
