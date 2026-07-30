import { describe, expect, it } from 'vitest'
import { buildAiContext, inferSegment, searchRelevantMemories } from './aiContext'
import type { ClientAiMemory } from '@/types/database'

const memories: ClientAiMemory[] = [
  {
    id: '1',
    workspace_id: 'ws',
    client_id: 'c1',
    category: 'BRIEFING',
    title: 'Identidade',
    content: 'AM Consultoria fortalece mulheres empreendedoras em São Luís',
    importance: 8,
    active: true,
    created_by: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    workspace_id: 'ws',
    client_id: 'c1',
    category: 'INSIGHTS',
    title: 'Tom de voz',
    content: 'Comunicação acolhedora e profissional',
    importance: 5,
    active: true,
    created_by: null,
    created_at: '',
    updated_at: '',
  },
]

describe('aiContext', () => {
  it('busca memórias por termos da pergunta', () => {
    const result = searchRelevantMemories(memories, 'mulheres empreendedoras')
    expect(result[0].title).toBe('Identidade')
  })

  it('monta contexto com operações', () => {
    const { context, snippets } = buildAiContext(
      'AM Consultoria',
      memories,
      [{ title: 'Post Instagram', status: 'PRODUCTION' }],
      'identidade',
    )
    expect(context).toContain('AM Consultoria')
    expect(context).toContain('Post Instagram')
    expect(snippets.length).toBeGreaterThan(0)
  })

  it('infere segmento jurídico', () => {
    const legal: ClientAiMemory[] = [
      {
        ...memories[0],
        content: 'Escritório de advocacia OAB Maranhão',
      },
    ]
    expect(inferSegment(legal)).toBe('legal')
  })
})
