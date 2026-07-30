import { useClients } from '@/hooks/useClients'
import { SEGMENT_LABELS } from '@/utils/permissions'

export function WhatsAppPage() {
  const { clients } = useClients()
  const activeWithWhatsapp = clients.filter(
    (c) => c.status === 'active' && c.whatsapp_instance,
  )

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">WhatsApp IA</h2>
        <p className="text-slate-400">
          Atendimento via Evolution API + n8n (Fase 0)
        </p>
      </header>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="font-semibold text-emerald-300">Como funciona</h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>Evolution API recebe mensagem do WhatsApp</li>
          <li>n8n chama Edge Function <code className="text-emerald-400">whatsapp-webhook</code></li>
          <li>Sistema identifica segmento do cliente e avalia handoff (OAB/ANVISA/TSE)</li>
          <li>Se seguro, Claude responde com contexto filtrado por client_id</li>
          <li>Toda interação é registrada em ai_interaction_logs</li>
        </ol>

        <h3 className="mt-8 font-semibold">Instâncias configuradas</h3>
        {activeWithWhatsapp.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum cliente com whatsapp_instance. Configure no CRM.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeWithWhatsapp.map((c) => (
              <li
                key={c.id}
                className="flex justify-between rounded-lg bg-slate-950 px-4 py-2 text-sm"
              >
                <span>{c.name}</span>
                <span className="text-slate-500">
                  {SEGMENT_LABELS[c.segment]} · {c.whatsapp_instance}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Workflow n8n: <code>n8n/workflows/whatsapp-ai.json</code>
        </p>
      </div>
    </div>
  )
}
