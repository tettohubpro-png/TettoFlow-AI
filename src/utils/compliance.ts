import type { ClientSegment } from '@/types/database'

const LEGAL_PATTERNS = [
  /processo\s+n[úu]mero/i,
  /meu\s+caso/i,
  /posso\s+processar/i,
  /direito\s+de/i,
  /advogad[oa]/i,
  /jurídic/i,
]

const HEALTH_PATTERNS = [
  /garante\s+resultado/i,
  /emagrecer\s+\d+/i,
  /cura\s+/i,
  /sem\s+risco/i,
  /procedimento\s+seguro/i,
]

const ELECTORAL_PATTERNS = [
  /votem?\s+em/i,
  /candidat[oa]/i,
  /elei[çc][ãa]o/i,
  /propaganda\s+eleitoral/i,
  /n[úu]mero\s+\d{2,5}/i,
]

export interface HandoffResult {
  required: boolean
  reason: string | null
  intentClass: string
}

export function evaluateHandoff(
  segment: ClientSegment,
  message: string,
): HandoffResult {
  const text = message.trim()

  if (segment === 'legal' && LEGAL_PATTERNS.some((p) => p.test(text))) {
    return {
      required: true,
      reason: 'Aconselhamento jurídico específico — escalado para humano (OAB)',
      intentClass: 'legal_advice',
    }
  }

  if (
    segment === 'health_aesthetics' &&
    HEALTH_PATTERNS.some((p) => p.test(text))
  ) {
    return {
      required: true,
      reason: 'Promessa de resultado em saúde/estética — escalado (ANVISA)',
      intentClass: 'health_promise',
    }
  }

  if (
    segment === 'electoral' &&
    ELECTORAL_PATTERNS.some((p) => p.test(text))
  ) {
    return {
      required: true,
      reason: 'Conteúdo de propaganda eleitoral — escalado (TSE)',
      intentClass: 'electoral_propaganda',
    }
  }

  return { required: false, reason: null, intentClass: 'general' }
}
