import type { ClientAiMemory, ClientSegment } from '@/types/database'
import { evaluateHandoff } from '@/utils/compliance'
import {
  buildAiContext,
  inferSegment,
  type OperationSummary,
} from '@/utils/aiContext'

export interface AiReplyResult {
  reply: string
  handoff: boolean
  handoffReason: string | null
  segment: ClientSegment
  contextSnippets: string[]
}

export function generateContextualReply(params: {
  clientName: string
  message: string
  memories: ClientAiMemory[]
  operations: OperationSummary[]
  segment?: ClientSegment
}): AiReplyResult {
  const segment = params.segment ?? inferSegment(params.memories)
  const handoffResult = evaluateHandoff(segment, params.message)

  const { snippets } = buildAiContext(
    params.clientName,
    params.memories,
    params.operations,
    params.message,
  )

  if (handoffResult.required) {
    return {
      reply:
        'Recebi sua mensagem. Um atendente da equipe TettoHub vai continuar o atendimento em breve.',
      handoff: true,
      handoffReason: handoffResult.reason,
      segment,
      contextSnippets: snippets,
    }
  }

  const relevant = snippets.slice(0, 2)
  let reply = `Olá! Sou o assistente da ${params.clientName}. `

  if (relevant.length > 0) {
    const excerpt = relevant[0].split(': ').slice(1).join(': ').slice(0, 200)
    reply += `Com base no que sei sobre você: ${excerpt}`
    if (excerpt.length >= 200) reply += '...'
    reply += ' Como posso ajudar com mais detalhes?'
  } else {
    reply += 'Como posso ajudar você hoje?'
  }

  const lower = params.message.toLowerCase()
  if (/hor[aá]rio|atendimento|funcionamento/.test(lower)) {
    reply =
      `Olá! Sou o assistente da ${params.clientName}. ` +
      'Para horários e atendimento, nossa equipe pode confirmar os detalhes atualizados. Posso ajudar com outra dúvida sobre nossos serviços?'
  }

  if (/opera[çc][aã]o|projeto|status|andamento/.test(lower) && params.operations.length > 0) {
    const active = params.operations.filter((o) => o.status !== 'DONE').slice(0, 3)
    if (active.length > 0) {
      const list = active.map((o) => o.title).join(', ')
      reply = `Olá! Temos em andamento: ${list}. Quer saber mais sobre alguma dessas entregas?`
    }
  }

  return {
    reply,
    handoff: false,
    handoffReason: null,
    segment,
    contextSnippets: snippets,
  }
}
