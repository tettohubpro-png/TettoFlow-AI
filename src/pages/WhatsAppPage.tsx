import { useState } from 'react'
import type { FormEvent } from 'react'
import { useClients } from '@/hooks/useClients'
import { useClientMemory } from '@/hooks/useClientMemory'
import { useOperations } from '@/hooks/useOperations'
import { generateContextualReply } from '@/utils/aiReply'
import type { AiChatMessage } from '@/types/database'

export function WhatsAppPage() {
  const { clients } = useClients()
  const activeClients = clients.filter((c) => c.status === 'ACTIVE')
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? '')
  const { memories, logInteraction } = useClientMemory(clientId || undefined)
  const { operations } = useOperations(clientId || undefined)

  const [phone] = useState('5598987654321')
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState<AiChatMessage[]>([])
  const [sending, setSending] = useState(false)

  const selectedClient = activeClients.find((c) => c.id === clientId)

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedClient) return

    setSending(true)
    const userMsg = message.trim()
    setMessage('')

    const clientOps = operations
      .filter((o) => o.client_id === clientId)
      .map((o) => ({ title: o.title, status: o.status }))

    const result = generateContextualReply({
      clientName: selectedClient.name,
      message: userMsg,
      memories,
      operations: clientOps,
    })

    setChat((prev) => [
      ...prev,
      { role: 'user', content: userMsg },
      {
        role: 'assistant',
        content: result.reply,
        handoff: result.handoff,
        contextSnippets: result.contextSnippets,
      },
    ])

    await logInteraction(`[WhatsApp ${phone}] ${userMsg}`, result.reply)
    setSending(false)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">WhatsApp IA</h2>
        <p className="text-slate-400">
          Simulador com contexto real — Evolution API + n8n em produção
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <label className="mb-2 block text-sm text-slate-400">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setChat([])
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
            <h3 className="font-semibold text-emerald-300">Fluxo produção</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-slate-400">
              <li>Evolution API recebe mensagem</li>
              <li>n8n → <code className="text-emerald-400">whatsapp-webhook</code></li>
              <li>Handoff OAB/ANVISA/TSE</li>
              <li>Resposta com <code>client_ai_memory</code></li>
            </ol>
            <p className="mt-3 text-xs text-slate-600">
              Memórias carregadas: {memories.length}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex h-[min(70dvh,520px)] flex-col rounded-xl border border-slate-800 bg-slate-900/40 sm:h-[480px]">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="font-medium">{selectedClient?.name ?? '—'}</p>
              <p className="text-xs text-slate-500">+{phone}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chat.length === 0 && (
                <p className="text-center text-sm text-slate-600">
                  Envie uma mensagem para testar o atendimento com contexto real.
                </p>
              )}
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {msg.content}
                    {msg.handoff && (
                      <p className="mt-1 text-xs text-amber-300">⚠ Handoff humano</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="border-t border-slate-800 p-4">
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !clientId}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
