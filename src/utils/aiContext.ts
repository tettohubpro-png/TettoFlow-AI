import type { ClientAiMemory } from '@/types/database'

export interface OperationSummary {
  title: string
  status: string
}

export function searchRelevantMemories(
  memories: ClientAiMemory[],
  query: string,
  limit = 4,
): ClientAiMemory[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)

  const active = memories.filter((m) => m.active)

  const scored = active.map((m) => {
    const text = `${m.title} ${m.content}`.toLowerCase()
    const termScore = terms.reduce((s, t) => s + (text.includes(t) ? 2 : 0), 0)
    const categoryBoost = m.category === 'BRIEFING' ? 1 : 0
    return { m, score: termScore + m.importance * 0.1 + categoryBoost }
  })

  scored.sort((a, b) => b.score - a.score)

  if (terms.length === 0) {
    return scored.slice(0, limit).map((x) => x.m)
  }

  const relevant = scored.filter((x) => x.score > 0).map((x) => x.m)
  if (relevant.length > 0) return relevant.slice(0, limit)

  return scored.slice(0, limit).map((x) => x.m)
}

export function buildAiContext(
  clientName: string,
  memories: ClientAiMemory[],
  operations: OperationSummary[],
  query: string,
): { context: string; snippets: string[] } {
  const relevant = searchRelevantMemories(memories, query)
  const snippets = relevant.map((m) => `[${m.category}] ${m.title}: ${m.content.slice(0, 300)}`)

  const opsLines = operations
    .filter((o) => o.status !== 'DONE')
    .slice(0, 5)
    .map((o) => `- ${o.title} (${o.status})`)

  const parts = [
    `Cliente: ${clientName}`,
    '',
    'Memória relevante:',
    ...snippets,
  ]

  if (opsLines.length > 0) {
    parts.push('', 'Operações em andamento:', ...opsLines)
  }

  return { context: parts.join('\n'), snippets }
}

/**
 * Retorna TODOS os segmentos de compliance que o cliente pode acionar, não só
 * o primeiro que bater — um cliente pode ser advogado E candidato ao mesmo
 * tempo (ex: Vagner Miranda), e cada perfil tem sua própria regra de handoff.
 * Ver PROJECT_LESSONS.md LES-0023.
 */
export function inferSegments(
  memories: ClientAiMemory[],
): ('legal' | 'health_aesthetics' | 'electoral' | 'general')[] {
  const text = memories.map((m) => `${m.title} ${m.content}`).join(' ').toLowerCase()
  const segments: ('legal' | 'health_aesthetics' | 'electoral')[] = []
  if (/oab|jur[ií]dic|advogad/.test(text)) segments.push('legal')
  if (/anvisa|est[eé]tica|sa[uú]de|cl[ií]nica/.test(text)) segments.push('health_aesthetics')
  if (/elei[çc][aã]o|tse|candidat/.test(text)) segments.push('electoral')
  return segments.length > 0 ? segments : ['general']
}
