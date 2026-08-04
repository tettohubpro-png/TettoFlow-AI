import type { Department } from '@/types/database'

export const DEPARTMENT_LABELS: Record<Department, string> = {
  social_media: 'Social Media',
  design: 'Design',
  videomaker: 'Videomaker',
  video_editor: 'Editor de Vídeo',
  photographer: 'Fotógrafo',
  traffic: 'Tráfego Pago',
  general: 'Geral',
}

export const DEPARTMENT_ORDER: Department[] = [
  'social_media',
  'design',
  'videomaker',
  'video_editor',
  'photographer',
  'traffic',
  'general',
]

/** Departamentos que recebem responsável por cliente */
export const ASSIGNABLE_DEPARTMENTS = [
  'social_media',
  'design',
  'videomaker',
  'photographer',
  'video_editor',
  'traffic',
] as const

const RULES: { department: Department; pattern: RegExp }[] = [
  { department: 'social_media', pattern: /social media|calend[aá]rio|produ[cç][aã]o mensal|post|instagram|stories|reels/i },
  { department: 'design', pattern: /design|identidade|arte/i },
  { department: 'videomaker', pattern: /videomaker|grava[cç][aã]o|filmagem/i },
  { department: 'video_editor', pattern: /editor|roteiro|edi[cç][aã]o/i },
  { department: 'photographer', pattern: /foto|fot[oó]grafo|ensaio/i },
  { department: 'traffic', pattern: /tr[aá]fego|ads|meta ads|google ads/i },
]

export function classifyDepartment(title: string): Department {
  for (const rule of RULES) {
    if (rule.pattern.test(title)) return rule.department
  }
  return 'general'
}
