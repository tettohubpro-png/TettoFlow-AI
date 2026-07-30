import { useState } from 'react'
import type { FormEvent } from 'react'
import { useClients } from '@/hooks/useClients'
import { useClientMemory } from '@/hooks/useClientMemory'
import { useOperations } from '@/hooks/useOperations'
import { generateContextualReply } from '@/utils/aiReply'
import type { AiChatMessage, MemoryCategory } from '@/types/database'

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  PREFERENCES: 'Preferências',
  HISTORY: 'Histórico',
  BRIEFING: 'Briefing',
  CONSTRAINTS: 'Restrições',
  INSIGHTS: 'Insights',
  BRAND: 'Marca',
}

export function AiPage() {
  const { clients } = useClients()
  const activeClients = clients.filter((c) => c.status === 'ACTIVE')
  const [clientId, setClientId] = useState('')
  const { memories, loading, addMemory, logInteraction } = useClientMemory(
    clientId || undefined,
  )
  const { operations } = useOperations(clientId || undefined)

  const [form, setForm] = useState({ title: '', content: '', category: 'BRIEFING' as MemoryCategory })
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<AiChatMessage[]>([])
  const [asking, setAsking] = useState(false)

  const selectedClient = activeClients.find((c) => c.id === clientId)

  const handleAddMemory = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await addMemory(form)
    if (!error) setForm({ title: '', content: '', category: 'BRIEFING' })
  }

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !selectedClient) return

    setAsking(true)
    const userMsg = question.trim()
    setQuestion('')

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

    await logInteraction(userMsg, result.reply)
    setAsking(false)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">IA Operacional</h2>
        <p className="text-slate-400">Memória do cliente + consultas com contexto real</p>
      </header>

      <div className="mb-6">
        <label className="mb-2 block text-sm text-slate-400">Cliente</label>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value)
            setChat([])
          }}
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        >
          <option value="">Selecione um cliente</option>
          {activeClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!clientId ? (
        <p className="text-slate-500">Selecione um cliente para gerenciar memória e testar a IA.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-emerald-300">Memória IA ({memories.length})</h3>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Carregando...</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {memories.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {CATEGORY_LABELS[m.category]} · {m.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.content}</p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddMemory} className="mt-4 space-y-2">
              <input
                required
                placeholder="Título"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Conteúdo para a IA conhecer este cliente"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as MemoryCategory })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                Adicionar memória
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="font-semibold text-violet-300">Consulta interna</h3>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {chat.length === 0 && (
                <p className="text-sm text-slate-500">
                  Pergunte sobre o cliente — a IA usa memória e operações reais.
                </p>
              )}
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'ml-8 bg-slate-800'
                      : 'mr-8 bg-emerald-500/10'
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.handoff && (
                    <p className="mt-1 text-xs text-amber-400">Handoff humano acionado</p>
                  )}
                  {msg.contextSnippets && msg.contextSnippets.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      Contexto: {msg.contextSnippets.length} trecho(s)
                    </p>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleAsk} className="mt-4 flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: Qual o status das operações?"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={asking}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm disabled:opacity-50"
              >
                {asking ? '...' : 'Perguntar'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
