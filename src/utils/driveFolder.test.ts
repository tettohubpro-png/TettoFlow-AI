import { describe, expect, it } from 'vitest'
import { buildDriveFolderName, slugifyCompanyName } from './driveFolder'

describe('driveFolder', () => {
  it('slugifica nome da empresa', () => {
    expect(slugifyCompanyName('AM Consultoria')).toBe('AM-Consultoria')
    expect(slugifyCompanyName('Q-Ball')).toBe('Q-Ball')
  })

  it('monta pasta Empresa_Data', () => {
    expect(buildDriveFolderName('AM Consultoria', '2026-07-30')).toBe(
      'AM-Consultoria_2026-07-30',
    )
  })
})
