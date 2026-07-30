import { describe, expect, it } from 'vitest'
import { classifyDepartment } from './departments'

describe('classifyDepartment', () => {
  it('classifica social media', () => {
    expect(classifyDepartment('[Onboarding] Social Media — Setup')).toBe('social_media')
    expect(classifyDepartment('Calendário Editorial Q1')).toBe('social_media')
  })

  it('classifica design', () => {
    expect(classifyDepartment('[Onboarding] Design — Identidade Visual')).toBe('design')
  })

  it('classifica videomaker e editor', () => {
    expect(classifyDepartment('[Onboarding] Videomaker — Planejamento')).toBe('videomaker')
    expect(classifyDepartment('[Onboarding] Editor — Roteiro Inicial')).toBe('video_editor')
  })

  it('usa geral como fallback', () => {
    expect(classifyDepartment('Briefing Inicial')).toBe('general')
  })
})
