export interface OperationLabel {
  id: string
  name: string
  color: string
}

export interface OperationChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface OperationCustomField {
  id: string
  label: string
  value: string
}

export interface OperationExtendedMeta {
  labels: OperationLabel[]
  checklist: OperationChecklistItem[]
  custom_fields: OperationCustomField[]
}

export const LABEL_PRESETS: Omit<OperationLabel, 'id'>[] = [
  { name: 'Andamento', color: '#eab308' },
  { name: 'Urgente', color: '#ef4444' },
  { name: 'Aguardando', color: '#3b82f6' },
  { name: 'Revisão', color: '#a855f7' },
  { name: 'Concluído', color: '#22c55e' },
]

export function emptyOperationMeta(): OperationExtendedMeta {
  return {
    labels: [],
    checklist: [],
    custom_fields: [],
  }
}

export function parseMetadataJson(
  metadata: Record<string, unknown> | null | undefined,
): OperationExtendedMeta {
  if (!metadata || typeof metadata !== 'object') return emptyOperationMeta()
  const labels = Array.isArray(metadata.labels) ? (metadata.labels as OperationLabel[]) : []
  const checklist = Array.isArray(metadata.checklist)
    ? (metadata.checklist as OperationChecklistItem[])
    : []
  const custom_fields = Array.isArray(metadata.custom_fields)
    ? (metadata.custom_fields as OperationCustomField[])
    : []
  return { labels, checklist, custom_fields }
}

export function buildMetadataJson(
  form: Pick<OperationFormData, 'labels' | 'checklist' | 'custom_fields'>,
): OperationExtendedMeta {
  return {
    labels: form.labels,
    checklist: form.checklist,
    custom_fields: form.custom_fields,
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

export interface OperationFormData {
  client_id: string
  title: string
  description: string
  start_date: string
  deadline: string
  labels: OperationLabel[]
  checklist: OperationChecklistItem[]
  custom_fields: OperationCustomField[]
}

export function emptyOperationForm(clientId = ''): OperationFormData {
  return {
    client_id: clientId,
    title: '',
    description: '',
    start_date: '',
    deadline: '',
    labels: [],
    checklist: [],
    custom_fields: [],
  }
}
