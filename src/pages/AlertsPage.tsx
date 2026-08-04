import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useClients } from '@/hooks/useClients'
import {
  ALERT_TYPE_LABELS,
  buildAlertTemplate,
  useClientAlerts,
} from '@/hooks/useClientAlerts'
import { useAuth } from '@/contexts/AuthContext'
import { canSendClientAlerts } from '@/utils/permissions'
import type { AlertChannel, AlertType } from '@/types/database'

export function AlertsPage() {
  const { clients } = useClients()
  const { alerts, loading, createAlert, markSent } = useClientAlerts()
  const { role } = useAuth()
  const canSend = canSendClientAlerts(role ?? undefined)

  const [clientId, setClientId] = useState('')
  const [channel, setChannel] = useState<AlertChannel>('whatsapp')
  const [alertType, setAlertType] = useState<AlertType>('themes')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const clientName = clients.find((c) => c.id === clientId)?.name ?? 'Cliente'

  useEffect(() => {
    if (!clientId) return
    const tpl = buildAlertTemplate(alertType, clientName)
    setSubject(tpl.subject)
    setBody(tpl.body)
  }, [clientId, alertType, clientName])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    setSaving(true)
    setFeedback(null)
    const { data, error } = await createAlert({
      client_id: clientId,
      channel,
      alert_type: alertType,
      subject,
      body,
    })
    setSaving(false)
    if (error) {
      setFeedback(error)
      return
    }

    if (channel === 'whatsapp') {
      const phoneHint = ''
      const wa = `https://wa.me/${phoneHint}?text=${encodeURIComponent(body)}`
      window.open(wa.replace('wa.me/?', 'wa.me/?'), '_blank')
      setFeedback('Alerta criado. Abra o WhatsApp e envie a mensagem ao cliente.')
    } else {
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailto, '_blank')
      setFeedback('Alerta criado. Abra o Gmail/cliente de e-mail para enviar.')
    }

    if (data) await markSent(data.id)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Alertas ao cliente</h2>
        <p className="text-slate-400">
          Relatório mensal, cronograma e temas via WhatsApp ou Gmail
        </p>
      </header>

      {canSend ? (
        <form
          onSubmit={handleSubmit}
          className="mb-8 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Cliente</span>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            >
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Canal</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as AlertChannel)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="gmail">Gmail</option>
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-400">Tipo de alerta</span>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as AlertType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            >
              {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
                <option key={t} value={t}>
                  {ALERT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-400">Assunto</span>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-400">Mensagem</span>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 sm:col-span-2"
          >
            {saving ? 'Preparando...' : 'Criar alerta e abrir envio'}
          </button>
          {feedback && <p className="text-sm text-slate-400 sm:col-span-2">{feedback}</p>}
        </form>
      ) : (
        <p className="mb-6 text-sm text-slate-500">
          Apenas proprietário, admin ou gerente pode enviar alertas.
        </p>
      )}

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Histórico
      </h3>
      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : alerts.length === 0 ? (
        <p className="text-slate-500">Nenhum alerta ainda.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{a.clients?.name ?? 'Cliente'}</p>
                <p className="text-xs text-slate-500">
                  {ALERT_TYPE_LABELS[a.alert_type]} · {a.channel} · {a.status}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-400">{a.subject}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
