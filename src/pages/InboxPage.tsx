import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  Building2,
  Clock,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Send,
  User,
  X,
} from 'lucide-react'
import { useConversations, useConversationMessages } from '@/hooks/useConversations'
import { useClientMemory } from '@/hooks/useClientMemory'
import { useOperations } from '@/hooks/useOperations'
import { useClients } from '@/hooks/useClients'
import { supabase } from '@/lib/supabase'
import { generateContextualReply } from '@/utils/aiReply'
import type { Conversation, AiChatMessage } from '@/types/database'

export function InboxPage() {
  const { conversations, previews, loading } = useConversations()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [infoOpen, setInfoOpen] = useState(false)
  const [view, setView] = useState<'conversas' | 'simulador'>('conversas')

  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <h2 className="text-2xl font-bold">WhatsApp</h2>
        <p className="text-slate-400">
          {view === 'conversas'
            ? 'Conversas reais de WhatsApp atendidas pelo agente de IA'
            : 'Simulador com contexto real — em produção fala direto com a Evolution API'}
        </p>
      </header>

      <div className="mb-4 flex gap-1 border-b border-slate-800">
        {(
          [
            { key: 'conversas', label: 'Conversas' },
            { key: 'simulador', label: 'Simulador' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`min-h-10 rounded-t-lg px-3 text-sm ${
              view === key
                ? 'bg-emerald-500/20 font-medium text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'simulador' ? (
        <WhatsAppSimulator />
      ) : (
      <>
      <div className="flex h-[min(75dvh,640px)] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        {/* Lista de conversas */}
        <div
          className={`w-full shrink-0 flex-col border-r border-slate-800 md:flex md:w-72 ${
            selectedId ? 'hidden' : 'flex'
          }`}
        >
          <ConversationList
            conversations={conversations}
            previews={previews}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Thread */}
        <div
          className={`min-w-0 flex-1 flex-col md:flex ${selectedId ? 'flex' : 'hidden'}`}
        >
          {selected ? (
            <Thread
              conversation={selected}
              onBack={() => setSelectedId(undefined)}
              onOpenInfo={() => setInfoOpen(true)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-600">
              Selecione uma conversa pra ver as mensagens
            </div>
          )}
        </div>

        {/* Painel de contexto — fixo em telas grandes, sheet nas menores */}
        {selected && (
          <div className="hidden w-80 shrink-0 border-l border-slate-800 xl:block">
            {selected.client_id ? (
              <ClientContextPanel key={selected.id} conversation={selected} />
            ) : (
              <InternalContextPanel key={selected.id} conversation={selected} />
            )}
          </div>
        )}
      </div>

      {selected && infoOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/60"
            onClick={() => setInfoOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[min(20rem,88vw)] overflow-y-auto border-l border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="font-medium">Informações do cliente</p>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            {selected.client_id ? (
              <ClientContextPanel key={selected.id} conversation={selected} />
            ) : (
              <InternalContextPanel key={selected.id} conversation={selected} />
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

function ConversationList({
  conversations,
  previews,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[]
  previews: Record<string, string>
  loading: boolean
  selectedId: string | undefined
  onSelect: (id: string) => void
}) {
  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Carregando conversas…</p>
  }
  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-600">
        Nenhuma conversa ainda. Assim que o WhatsApp receber uma mensagem, ela aparece
        aqui.
      </p>
    )
  }

  return (
    <ul className="flex-1 divide-y divide-slate-800 overflow-y-auto">
      {conversations.map((c) => {
        const preview = previews[c.id]
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex min-h-16 w-full flex-col gap-0.5 px-4 py-3 text-left transition ${
                selectedId === c.id ? 'bg-emerald-500/10' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {c.clients?.name ?? c.contact_name ?? c.contact_phone}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {c.kind === 'internal' && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      <Building2 size={10} /> Equipe
                    </span>
                  )}
                  {c.kind === 'unknown' && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                      <HelpCircle size={10} /> Não identificado
                    </span>
                  )}
                  {c.handoff_required && <AlertTriangle size={14} className="text-amber-400" />}
                </div>
              </div>
              <span className="truncate text-xs text-slate-500">{c.contact_phone}</span>
              {preview && (
                <span className="truncate text-xs text-slate-400">{preview}</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Thread({
  conversation,
  onBack,
  onOpenInfo,
}: {
  conversation: Conversation
  onBack: () => void
  onOpenInfo: () => void
}) {
  const { messages, loading, refresh } = useConversationMessages(conversation.id)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Ao abrir a conversa e sempre que chegar mensagem nova (própria ou
  // realtime), pula direto pra última mensagem — não faz sentido abrir e cair
  // no começo da conversa, tendo que rolar manualmente até o fim.
  useEffect(() => {
    if (loading) return
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [conversation.id, loading, messages.length])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setSendError(null)
    const { error } = await supabase.functions.invoke('send-message', {
      body: { conversation_id: conversation.id, content },
    })
    setSending(false)
    if (error) {
      setSendError('Não consegui enviar. Tenta de novo.')
      return
    }
    setDraft('')
    refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 md:hidden"
          aria-label="Voltar"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {conversation.clients?.name ?? conversation.contact_name ?? 'Contato'}
          </p>
          <p className="truncate text-xs text-slate-500">
            {conversation.contact_phone}
            {conversation.kind === 'internal' && ' · conversa interna da equipe'}
            {conversation.kind === 'unknown' && ' · número não identificado'}
          </p>
        </div>
        {conversation.handoff_required && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            <AlertTriangle size={12} /> Handoff
          </span>
        )}
        <button
          type="button"
          onClick={onOpenInfo}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 xl:hidden"
          aria-label="Informações do cliente"
        >
          <User size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-center text-sm text-slate-600">Carregando…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-slate-600">Sem mensagens ainda</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] items-end gap-2 ${
                m.direction === 'outbound' ? 'flex-row-reverse' : ''
              }`}
            >
              {m.is_ai && (
                <span className="mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300">
                  <Bot size={13} />
                </span>
              )}
              <div
                className={`rounded-2xl px-4 py-2 text-sm ${
                  m.direction === 'outbound'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {m.content}
                <p
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    m.direction === 'outbound' ? 'text-emerald-100/70' : 'text-slate-500'
                  }`}
                >
                  <Clock size={10} />
                  {new Date(m.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800 p-3">
        {sendError && <p className="mb-2 text-xs text-red-400">{sendError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Digite uma mensagem…"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

function InternalContextPanel({ conversation }: { conversation: Conversation }) {
  const isUnknown = conversation.kind === 'unknown'
  return (
    <div className="flex h-full flex-col gap-5 p-4 text-sm">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {isUnknown ? 'Contato não identificado' : 'Conversa interna'}
        </p>
        <p className="flex items-center gap-2 font-medium">
          {isUnknown ? (
            <HelpCircle size={14} className="text-amber-400" />
          ) : (
            <Building2 size={14} className="text-slate-500" />
          )}
          {conversation.contact_name ?? 'Membro da equipe'}
        </p>
        {isUnknown ? (
          <p className="mt-2 text-xs text-amber-300/90">
            Esse número não bateu com nenhum cliente nem operador cadastrado — pode ser um
            cliente novo, um lead, ou alguém que precisa ser cadastrado. Vale a pena identificar
            quem é.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Não é uma conversa com cliente — é o Hermes falando com alguém da equipe (ou uma
            mensagem enviada pelo Hermes a pedido de alguém), pelo número da agência.
          </p>
        )}
      </section>

      <section className="space-y-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contato
        </p>
        <p className="flex items-center gap-2 text-slate-300">
          <Phone size={14} className="text-slate-500" /> {conversation.contact_phone ?? '—'}
        </p>
      </section>
    </div>
  )
}

function ClientContextPanel({ conversation }: { conversation: Conversation }) {
  const { memories, loading: memoriesLoading } = useClientMemory(conversation.client_id ?? undefined)
  const { operations, loading: opsLoading } = useOperations(conversation.client_id ?? undefined)

  const relevantMemories = useMemo(
    () => memories.filter((m) => m.category === 'BRIEFING' || m.category === 'PREFERENCES'),
    [memories],
  )
  const activeOperations = useMemo(
    () => operations.filter((o) => o.status !== 'DONE'),
    [operations],
  )

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 text-sm">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Cliente
        </p>
        <p className="font-medium">
          {conversation.clients?.name ?? conversation.contact_name ?? 'Contato'}
        </p>
        <span
          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${
            conversation.clients?.status === 'ACTIVE'
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {conversation.clients?.status === 'ACTIVE' ? 'Ativo' : 'Inativo / lead'}
        </span>
        {conversation.client_id && (
          <Link
            to={`/crm/${conversation.client_id}`}
            className="mt-2 block text-xs text-emerald-300 hover:underline"
          >
            Abrir briefing completo →
          </Link>
        )}
      </section>

      <section className="space-y-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contato
        </p>
        <p className="flex items-center gap-2 text-slate-300">
          <Phone size={14} className="text-slate-500" /> {conversation.contact_phone ?? '—'}
        </p>
        {conversation.contact_name && (
          <p className="flex items-center gap-2 text-slate-300">
            <User size={14} className="text-slate-500" /> {conversation.contact_name}
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Memória / briefing
        </p>
        {memoriesLoading && <p className="text-xs text-slate-600">Carregando…</p>}
        {!memoriesLoading && relevantMemories.length === 0 && (
          <p className="text-xs text-slate-600">Nenhuma memória cadastrada ainda.</p>
        )}
        <ul className="space-y-2">
          {relevantMemories.slice(0, 6).map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
              <p className="text-xs font-medium text-slate-300">{m.title}</p>
              <p className="mt-0.5 line-clamp-3 text-xs text-slate-500">{m.content}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Operações ativas
        </p>
        {opsLoading && <p className="text-xs text-slate-600">Carregando…</p>}
        {!opsLoading && activeOperations.length === 0 && (
          <p className="text-xs text-slate-600">Nenhuma operação em andamento.</p>
        )}
        <ul className="space-y-2">
          {activeOperations.slice(0, 6).map((op) => (
            <li key={op.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
              <p className="flex items-center gap-1 text-xs font-medium text-slate-300">
                <MessageCircle size={12} className="text-slate-500" />
                {op.title}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {op.status} · {op.priority}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {conversation.handoff_required && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
          <Mail size={14} /> Esse contato foi encaminhado pra atendimento humano.
        </p>
      )}
    </div>
  )
}

function WhatsAppSimulator() {
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
            <li>
              Webhook → <code className="text-emerald-400">agent-whatsapp</code>
            </li>
            <li>Handoff OAB/ANVISA/TSE</li>
            <li>
              Resposta via Evolution + <code>client_ai_memory</code>
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-600">Memórias carregadas: {memories.length}</p>
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
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {msg.content}
                  {msg.handoff && <p className="mt-1 text-xs text-amber-300">⚠ Handoff humano</p>}
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
  )
}
