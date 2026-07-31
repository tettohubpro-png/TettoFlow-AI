import { describe, expect, it } from 'vitest'
import { routeIntent } from './intentRouter'

describe('routeIntent', () => {
  it('rota posts para social media', () => {
    const r = routeIntent('Quero 3 posts no Instagram essa semana')
    expect(r.department).toBe('social_media')
    expect(r.intent).toBe('content_request')
  })

  it('rota gravação para videomaker', () => {
    const r = routeIntent('Podemos marcar gravação sexta às 14h?')
    expect(r.department).toBe('videomaker')
  })

  it('rota edição para editor', () => {
    const r = routeIntent('A edição do vídeo ficou pronta?')
    expect(r.department).toBe('video_editor')
  })

  it('rota ads para tráfego', () => {
    const r = routeIntent('Pode impulsionar a campanha no Meta Ads?')
    expect(r.department).toBe('traffic')
  })

  it('rota orçamento para comercial com humano', () => {
    const r = routeIntent('Quanto custa incluir tráfego no pacote?')
    expect(r.department).toBe('commercial')
    expect(r.needsHuman).toBe(true)
  })

  it('fallback geral', () => {
    const r = routeIntent('Bom dia, tudo bem?')
    expect(r.department).toBe('general')
  })
})
