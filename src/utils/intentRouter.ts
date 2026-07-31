export type AgentDepartment =
  | 'social_media'
  | 'videomaker'
  | 'video_editor'
  | 'traffic'
  | 'manager'
  | 'commercial'
  | 'general'

export interface IntentRoute {
  department: AgentDepartment
  intent: string
  confidence: number
  needsHuman: boolean
  summary: string
}

export const DEPARTMENT_LABELS: Record<AgentDepartment, string> = {
  social_media: 'Social Media',
  videomaker: 'Videomaker',
  video_editor: 'Editor de Vídeo',
  traffic: 'Gestor de Tráfego',
  manager: 'Gestor',
  commercial: 'Comercial',
  general: 'Atendimento',
}

const RULES: {
  department: AgentDepartment
  intent: string
  patterns: RegExp[]
  needsHuman?: boolean
}[] = [
  {
    department: 'social_media',
    intent: 'content_request',
    patterns: [
      /post(s)?/i,
      /storie?s?/i,
      /reels?/i,
      /legenda/i,
      /feed/i,
      /calend[aá]rio/i,
      /carrossel/i,
      /conte[uú]do/i,
      /instagram/i,
    ],
  },
  {
    department: 'videomaker',
    intent: 'recording_schedule',
    patterns: [
      /grava[cç][aã]o/i,
      /filmar/i,
      /filmagem/i,
      /marcar\s+(grava|filma)/i,
      /agendar\s+(grava|filma)/i,
      /local\s+da\s+grava/i,
      /roteiro\s+de\s+grava/i,
    ],
  },
  {
    department: 'video_editor',
    intent: 'editing_request',
    patterns: [
      /edi[cç][aã]o/i,
      /editar\s+(o\s+)?v[ií]deo/i,
      /corte/i,
      /legendas?\s+(no\s+)?v[ií]deo/i,
      /after\s*effects/i,
      /capcut/i,
      /vers[aã]o\s+editada/i,
    ],
  },
  {
    department: 'traffic',
    intent: 'ads_request',
    patterns: [
      /tr[aá]fego/i,
      /an[uú]ncio/i,
      /ads/i,
      /meta\s*ads/i,
      /google\s*ads/i,
      /impulsionar/i,
      /campanha/i,
      /investir\s+em\s+ads/i,
    ],
  },
  {
    department: 'commercial',
    intent: 'commercial',
    patterns: [
      /proposta/i,
      /or[cç]amento/i,
      /contrato/i,
      /pacote/i,
      /quanto\s+custa/i,
      /pre[cç]o/i,
      /renovar/i,
      /incluir\s+servi[cç]o/i,
    ],
    needsHuman: true,
  },
  {
    department: 'manager',
    intent: 'escalation',
    patterns: [
      /reclama/i,
      /atrasad/i,
      /urgente/i,
      /aprov(a|ação|ar)/i,
      /gestor/i,
      /respons[aá]vel/i,
      /problema\s+s[eé]rio/i,
    ],
    needsHuman: true,
  },
]

export function routeIntent(message: string): IntentRoute {
  const text = message.trim()
  if (!text) {
    return {
      department: 'general',
      intent: 'empty',
      confidence: 0,
      needsHuman: false,
      summary: 'Mensagem vazia',
    }
  }

  let best: IntentRoute | null = null

  for (const rule of RULES) {
    const hits = rule.patterns.filter((p) => p.test(text)).length
    if (hits === 0) continue
    const confidence = Math.min(0.95, 0.55 + hits * 0.15)
    const candidate: IntentRoute = {
      department: rule.department,
      intent: rule.intent,
      confidence,
      needsHuman: rule.needsHuman ?? false,
      summary: `${DEPARTMENT_LABELS[rule.department]} · ${rule.intent}`,
    }
    if (!best || candidate.confidence > best.confidence) best = candidate
  }

  if (best) return best

  return {
    department: 'general',
    intent: 'general_inquiry',
    confidence: 0.4,
    needsHuman: false,
    summary: 'Atendimento geral',
  }
}

export function departmentAssigneeLabel(department: AgentDepartment): string {
  return DEPARTMENT_LABELS[department]
}
