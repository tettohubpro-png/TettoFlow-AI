import { supabase } from '@/lib/supabase'
import type { ClientFile } from '@/types/database'

export const OPERATION_FILES_BUCKET = 'operation-files'

/** Caminho relativo no Storage (não é URL externa). */
export function isStorageObjectPath(path: string): boolean {
  if (!path) return false
  if (/^https?:\/\//i.test(path)) return false
  if (path.startsWith('pending-drive/')) return false
  return true
}

/** Abre o arquivo no navegador (Drive URL, Storage signed URL, ou avisa se só há metadado). */
export async function openClientFile(file: ClientFile): Promise<{ error: string | null }> {
  const path = file.storage_path?.trim()
  if (!path) {
    return { error: 'Este arquivo não tem caminho de armazenamento.' }
  }

  if (/^https?:\/\//i.test(path)) {
    window.open(path, '_blank', 'noopener,noreferrer')
    return { error: null }
  }

  if (path.startsWith('pending-drive/')) {
    return {
      error:
        'Arquivo só foi registrado (Drive não configurado). Reenvie pelo briefing com Drive ativo.',
    }
  }

  if (!isStorageObjectPath(path)) {
    return { error: 'Caminho de arquivo inválido.' }
  }

  const { data, error } = await supabase.storage
    .from(OPERATION_FILES_BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error || !data?.signedUrl) {
    return {
      error:
        'Não foi possível abrir. O arquivo pode não ter sido enviado de fato — reanexe e salve de novo.',
    }
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  return { error: null }
}

export function buildOperationStoragePath(
  workspaceId: string,
  clientId: string,
  operationId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, '_').slice(0, 180)
  return `${workspaceId}/${clientId}/${operationId}/${Date.now()}-${safeName}`
}
