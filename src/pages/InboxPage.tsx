import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  User,
  X,
} from 'lucide-react'
import { useConversations, useConversationMessages } from '@/hooks/useConversations'
import { useClientMemory } from '@/hooks/useClientMemory'
import { useOperations } from '@/hooks/useOperations'
import type { Conversation } from '@/types/database'

export function InboxPage() {
  const { conversations, previews, loading } = useConversations()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [infoOpen, setInfoOpen] = useState(false)

  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <h2 className="text-2xl font-bold">Mensagens</h2>
        <p className="text-slate-400">
          Conversas reais de WhatsApp atendidas pelo agente de IA
        </p>
      </header>

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
            <ClientContextPanel conversation={selected} />
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
            <ClientContextPanel conversation={selected} />
          </div>
        </div>
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
                {c.handoff_required && (
                  <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                )}
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
  const { messages, loading } = useConversationMessages(conversation.id)

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
          <p className="truncate text-xs text-slate-500">{conversation.contact_phone}</p>
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
      </div>
    </>
  )
}

function ClientContextPanel({ conversation }: { conversation: Conversation }) {
  const { memories, loading: memoriesLoading } = useClientMemory(conversation.client_id)
  const { operations, loading: opsLoading } = useOperations(conversation.client_id)

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
