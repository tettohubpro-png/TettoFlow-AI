import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_OPERATIONS,
  buildClientStoragePath,
  buildOnboardingMemoryContent,
} from './onboardingSteps'

describe('onboardingSteps', () => {
  it('define 8 operações de onboarding', () => {
    expect(ONBOARDING_OPERATIONS).toHaveLength(8)
    expect(ONBOARDING_OPERATIONS[0].title).toContain('Briefing')
  })

  it('monta caminho de storage do cliente', () => {
    expect(buildClientStoragePath('ws-1', 'cl-2')).toBe('ws-1/cl-2/')
  })

  it('gera conteúdo de memória IA', () => {
    const text = buildOnboardingMemoryContent('AM Consultoria', 8)
    expect(text).toContain('AM Consultoria')
    expect(text).toContain('8')
  })
})
