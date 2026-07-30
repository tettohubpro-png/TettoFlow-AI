import { describe, expect, it } from 'vitest'
import { evaluateHandoff } from './compliance'

describe('evaluateHandoff', () => {
  it('escala aconselhamento jurídico', () => {
    const r = evaluateHandoff('legal', 'Posso processar meu vizinho?')
    expect(r.required).toBe(true)
    expect(r.intentClass).toBe('legal_advice')
  })

  it('escala promessa de resultado em saúde', () => {
    const r = evaluateHandoff('health_aesthetics', 'Garante resultado em 7 dias?')
    expect(r.required).toBe(true)
    expect(r.intentClass).toBe('health_promise')
  })

  it('escala propaganda eleitoral', () => {
    const r = evaluateHandoff('electoral', 'Votem no candidato 45')
    expect(r.required).toBe(true)
    expect(r.intentClass).toBe('electoral_propaganda')
  })

  it('permite mensagem geral', () => {
    const r = evaluateHandoff('general', 'Qual o horário de atendimento?')
    expect(r.required).toBe(false)
  })
})
