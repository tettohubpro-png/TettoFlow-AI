import { describe, expect, it } from 'vitest'
import { generateContextualReply } from './aiReply'
import type { ClientAiMemory } from '@/types/database'

const memories: ClientAiMemory[] = [
  {
    id: '1',
    workspace_id: 'ws',
    client_id: 'c1',
    category: 'BRIEFING',
    title: 'Sobre',
    content: 'Consultoria para empreendedoras',
    importance: 8,
    active: true,
    created_by: null,
    created_at: '',
    updated_at: '',
  },
]

describe('generateContextualReply', () => {
  it('responde com contexto do cliente', () => {
    const r = generateContextualReply({
      clientName: 'AM Consultoria',
      message: 'Quem são vocês?',
      memories,
      operations: [],
    })
    expect(r.handoff).toBe(false)
    expect(r.reply).toContain('AM Consultoria')
  })

  it('aciona handoff jurídico', () => {
    const r = generateContextualReply({
      clientName: 'Escritório',
      message: 'Posso processar meu vizinho?',
      memories,
      operations: [],
      segment: 'legal',
    })
    expect(r.handoff).toBe(true)
  })

  it('menciona operações em andamento', () => {
    const r = generateContextualReply({
      clientName: 'AM Consultoria',
      message: 'Qual o status da operação?',
      memories,
      operations: [{ title: 'Post Instagram teste', status: 'PRODUCTION' }],
    })
    expect(r.reply).toContain('Post Instagram teste')
  })
})
