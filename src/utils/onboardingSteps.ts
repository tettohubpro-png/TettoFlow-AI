import type { OperationPriority, OperationStatus } from '@/types/database'
import { ONBOARDING_MARKER_TITLE, ONBOARDING_EVENT_KEY } from '@/types/database'

export { ONBOARDING_MARKER_TITLE, ONBOARDING_EVENT_KEY }

export interface OnboardingOperationStep {
  title: string
  status: OperationStatus
  priority: OperationPriority
}

/** Operações criadas automaticamente no onboarding */
export const ONBOARDING_OPERATIONS: OnboardingOperationStep[] = [
  { title: '[Onboarding] Briefing Inicial', status: 'DRAFT', priority: 'HIGH' },
  { title: '[Onboarding] Checklist de Documentos', status: 'DRAFT', priority: 'HIGH' },
  { title: '[Onboarding] Produção Mensal', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Calendário Editorial', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Social Media — Setup', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Design — Identidade Visual', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Videomaker — Planejamento', status: 'DRAFT', priority: 'LOW' },
  { title: '[Onboarding] Editor — Roteiro Inicial', status: 'DRAFT', priority: 'LOW' },
]

export function buildClientStoragePath(workspaceId: string, clientId: string): string {
  return `${workspaceId}/${clientId}/`
}

export function buildOnboardingMemoryContent(clientName: string, operationCount: number): string {
  return [
    `Onboarding inteligente concluído para ${clientName}.`,
    `Foram criadas ${operationCount} operações iniciais (briefing, checklist, produção, calendário e tarefas por departamento).`,
    'Pasta de arquivos do cliente provisionada.',
    'Equipe notificada para iniciar o kickoff.',
  ].join(' ')
}
