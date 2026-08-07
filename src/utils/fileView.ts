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

type FileAccessMode = 'open' | 'download'

function missingStorageError(path: string, errorMessage?: string): string {
  const detail = errorMessage?.toLowerCase() ?? ''
  const missing =
    path.startsWith('operations/') ||
    detail.includes('not found') ||
    detail.includes('object not found') ||
    detail.includes('404')

  return missing
    ? 'Este anexo só existe no banco (sem arquivo no Storage). Remova da lista e anexe de novo para ficar disponível para a equipe.'
    : `Não foi possível acessar o arquivo${errorMessage ? `: ${errorMessage}` : ''}.`
}

async function resolveClientFileUrl(
  file: ClientFile,
  mode: FileAccessMode,
): Promise<{ url: string | null; error: string | null }> {
  const path = file.storage_path?.trim()
  if (!path) {
    return { url: null, error: 'Este arquivo não tem caminho de armazenamento.' }
  }

  if (/^https?:\/\//i.test(path)) {
    return { url: path, error: null }
  }

  if (path.startsWith('pending-drive/')) {
    return {
      url: null,
      error:
        'Arquivo só foi registrado (Drive não configurado). Reenvie pelo briefing com Drive ativo.',
    }
  }

  if (!isStorageObjectPath(path)) {
    return { url: null, error: 'Caminho de arquivo inválido.' }
  }

  const { data, error } = await supabase.storage
    .from(OPERATION_FILES_BUCKET)
    .createSignedUrl(path, 60 * 60, {
      download: mode === 'download' ? file.name || true : undefined,
    })

  if (error || !data?.signedUrl) {
    return { url: null, error: missingStorageError(path, error?.message) }
  }

  return { url: data.signedUrl, error: null }
}

function triggerBrowserDownload(url: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/** Abre o arquivo no navegador (Drive URL, Storage signed URL, ou avisa se só há metadado). */
export async function openClientFile(file: ClientFile): Promise<{ error: string | null }> {
  const { url, error } = await resolveClientFileUrl(file, 'open')
  if (error || !url) return { error: error ?? 'Não foi possível abrir o arquivo.' }
  window.open(url, '_blank', 'noopener,noreferrer')
  return { error: null }
}

/** Baixa o arquivo (Storage com disposition attachment, ou abre URL externa). */
export async function downloadClientFile(file: ClientFile): Promise<{ error: string | null }> {
  const { url, error } = await resolveClientFileUrl(file, 'download')
  if (error || !url) return { error: error ?? 'Não foi possível baixar o arquivo.' }
  triggerBrowserDownload(url, file.name || 'anexo')
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
