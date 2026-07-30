import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { buildDriveFolderName } from '@/utils/driveFolder'

export interface UploadProgress {
  fileName: string
  status: 'uploading' | 'done' | 'error' | 'skipped'
  message?: string
  driveUrl?: string
}

export function useDriveUpload(clientId: string | undefined, clientName: string) {
  const { workspace, user, session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress[]>([])
  const [error, setError] = useState<string | null>(null)

  const uploadFiles = useCallback(
    async (files: File[], shootDate: string, videomakerName: string) => {
      if (!clientId || !workspace?.id || !user?.id) {
        return { error: 'Sessão inválida' }
      }

      setUploading(true)
      setError(null)
      const folderName = buildDriveFolderName(clientName, shootDate)
      const results: UploadProgress[] = files.map((f) => ({
        fileName: f.name,
        status: 'uploading' as const,
      }))
      setProgress([...results])

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const form = new FormData()
          form.append('file', file)
          form.append('client_id', clientId)
          form.append('workspace_id', workspace.id)
          form.append('folder_name', folderName)
          form.append('shoot_date', shootDate.slice(0, 10))
          form.append('videomaker_name', videomakerName)
          form.append('created_by', user.id)

          const res = await fetch(`${supabaseUrl}/functions/v1/drive-upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            body: form,
          })

          const body = await res.json()

          if (!res.ok || body.error) {
            // Fallback local: registra arquivo sem Drive se function não configurada
            if (res.status === 503 || body.code === 'DRIVE_NOT_CONFIGURED') {
              const storagePath = `pending-drive/${folderName}/${file.name}`
              const { error: fileErr } = await supabase.from('files').insert({
                workspace_id: workspace.id,
                client_id: clientId,
                name: `[${folderName}] ${file.name}`,
                storage_path: storagePath,
                mime_type: file.type || null,
                created_by: user.id,
              })
              if (fileErr) throw new Error(fileErr.message)
              results[i] = {
                fileName: file.name,
                status: 'skipped',
                message:
                  'Drive não configurado — registrado localmente. Configure secrets Google.',
              }
            } else {
              throw new Error(body.error ?? `HTTP ${res.status}`)
            }
          } else {
            results[i] = {
              fileName: file.name,
              status: 'done',
              driveUrl: body.webViewLink as string | undefined,
            }
          }
        } catch (err) {
          results[i] = {
            fileName: file.name,
            status: 'error',
            message: String(err),
          }
        }
        setProgress([...results])
      }

      setUploading(false)
      const failed = results.filter((r) => r.status === 'error')
      if (failed.length > 0) {
        setError(`${failed.length} arquivo(s) falharam`)
      }
      return { error: null, results }
    },
    [clientId, clientName, workspace?.id, user?.id, session?.access_token],
  )

  return { uploadFiles, uploading, progress, error, setProgress }
}
