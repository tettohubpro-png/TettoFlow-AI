import { useState } from 'react'
import type { FormEvent } from 'react'
import { useClients } from '@/hooks/useClients'
import { useClientMemory } from '@/hooks/useClientMemory'
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase'
import { useOperations } from '@/hooks/useOperations'
import { generateContextualReply } from '@/utils/aiReply'
import type {
  AiChatMessage,
  KnowledgeAudience,
  KnowledgeBaseEntry,
  KnowledgeCategory,
  MemoryCategory,
} from '@/types/database'

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  PREFERENCES: 'Preferências',
  HISTORY: 'Histórico',
  BRIEFING: 'Briefing',
  CONSTRAINTS: 'Restrições',
  INSIGHTS: 'Insights',
  BRAND: 'Marca',
}

const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  POLICY: 'Política',
  PRICING: 'Preços',
  PROCEDURE: 'Procedimento',
  FAQ: 'Perguntas frequentes',
  SERVICE: 'Serviço',
  BRAND: 'Marca/Tom de voz',
  GENERAL: 'Geral',
}

const AUDIENCE_LABELS: Record<KnowledgeAudience, string> = {
  hermes: 'Só Hermes (interno)',
  clients: 'Só bot de clientes',
  both: 'Hermes + clientes',
}

const EMPTY_KNOWLEDGE_FORM = {
  title: '',
  content: '',
  category: 'GENERAL' as KnowledgeCategory,
  audience: 'both' as KnowledgeAudience,
  importance: 5,
}

export function AiPage() {
  const [tab, setTab] = useState<'memoria' | 'conhecimento'>('memoria')

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">IA Operacional</h2>
        <p className="text-slate-400">Memória por cliente + base de conhecimento que o Hermes consulta</p>
      </header>

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {(
          [
            { key: 'memoria', label: 'Memória de Cliente' },
            { key: 'conhecimento', label: 'Base de Conhecimento' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-10 rounded-t-lg px-3 text-sm ${
              tab === key
                ? 'bg-emerald-500/20 font-medium text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'memoria' ? <ClientMemoryTab /> : <KnowledgeBaseTab />}
    </div>
  )
}

function ClientMemoryTab() {
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

function KnowledgeBaseTab() {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useKnowledgeBase()
  const [form, setForm] = useState(EMPTY_KNOWLEDGE_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<KnowledgeCategory | 'ALL'>('ALL')
  const [saving, setSaving] = useState(false)

  const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.category === filter)

  const startEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      audience: entry.audience,
      importance: entry.importance,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_KNOWLEDGE_FORM)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = editingId ? await updateEntry(editingId, form) : await addEntry(form)
    if (!result.error) {
      setEditingId(null)
      setForm(EMPTY_KNOWLEDGE_FORM)
    }
    setSaving(false)
  }

  const handleToggleActive = async (entry: KnowledgeBaseEntry) => {
    await updateEntry(entry.id, { active: !entry.active })
  }

  const handleDelete = async (entry: KnowledgeBaseEntry) => {
    if (!confirm(`Apagar "${entry.title}" da base de conhecimento?`)) return
    await deleteEntry(entry.id)
    if (editingId === entry.id) cancelEdit()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-emerald-300">
            {editingId ? 'Editar entrada' : 'Nova entrada'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            required
            placeholder="Título (ex: Prazo padrão de entrega)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <textarea
            required
            placeholder="Conteúdo — escreva como se estivesse explicando pra alguém novo na equipe"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={6}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as KnowledgeCategory })}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as KnowledgeAudience })}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Importância ({form.importance})
            <input
              type="range"
              min={1}
              max={10}
              value={form.importance}
              onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })}
              className="flex-1"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar à base'}
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          "Só Hermes" fica restrito ao assistente interno da equipe. "Só bot de clientes" e "Hermes +
          clientes" também podem aparecer nas respostas automáticas pro WhatsApp do cliente — não coloque
          nada sensível nessas duas opções.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-violet-300">Entradas ({filtered.length})</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as KnowledgeCategory | 'ALL')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
          >
            <option value="ALL">Todas categorias</option>
            {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nada cadastrado ainda. Comece com políticas, preços e procedimentos que se repetem no
            dia a dia.
          </p>
        ) : (
          <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-lg bg-slate-950/60 px-3 py-2 text-sm ${!entry.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {KNOWLEDGE_CATEGORY_LABELS[entry.category]} · {entry.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    {AUDIENCE_LABELS[entry.audience]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-xs text-slate-500">{entry.content}</p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(entry)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {entry.active ? 'Desativar' : 'Reativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
