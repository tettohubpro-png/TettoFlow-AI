import { useCallback, useRef, useState } from 'react'
import type { UploadProgress } from '@/hooks/useDriveUpload'

interface DriveDropzoneProps {
  disabled?: boolean
  uploading?: boolean
  progress: UploadProgress[]
  shootDate: string
  videomakerName: string
  onShootDateChange: (v: string) => void
  onVideomakerChange: (v: string) => void
  onFiles: (files: File[]) => void
}

export function DriveDropzone({
  disabled,
  uploading,
  progress,
  shootDate,
  videomakerName,
  onShootDateChange,
  onVideomakerChange,
  onFiles,
}: DriveDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const acceptFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return
      const files = Array.from(list).filter(
        (f) =>
          f.type.startsWith('video/') ||
          f.type.startsWith('image/') ||
          f.type.startsWith('audio/') ||
          /\.(mp4|mov|mkv|avi|jpg|jpeg|png|webp|wav|mp3)$/i.test(f.name),
      )
      if (files.length > 0) onFiles(files)
    },
    [onFiles],
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Data da gravação</span>
          <input
            type="date"
            value={shootDate}
            onChange={(e) => onShootDateChange(e.target.value)}
            disabled={disabled || uploading}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Videomaker</span>
          <input
            type="text"
            value={videomakerName}
            onChange={(e) => onVideomakerChange(e.target.value)}
            disabled={disabled || uploading}
            placeholder="Nome do videomaker"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (disabled || uploading) return
          acceptFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition sm:p-10 ${
          dragOver
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
        } ${disabled || uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <p className="font-medium text-slate-200">
          {uploading
            ? 'Enviando para o Google Drive...'
            : 'Arraste gravações aqui ou toque para selecionar'}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Vídeo, foto ou áudio · pasta criada como NomeEmpresa_YYYY-MM-DD
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,image/*,audio/*,.mp4,.mov,.mkv,.avi,.jpg,.jpeg,.png,.webp,.wav,.mp3"
          className="hidden"
          onChange={(e) => {
            acceptFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {progress.length > 0 && (
        <ul className="space-y-2 text-sm">
          {progress.map((p) => (
            <li
              key={p.fileName + p.status}
              className="flex flex-col gap-2 rounded-lg bg-slate-950/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="truncate">{p.fileName}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    p.status === 'done'
                      ? 'text-emerald-400'
                      : p.status === 'error'
                        ? 'text-red-400'
                        : p.status === 'skipped'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                  }
                >
                  {p.status === 'uploading' && 'Enviando...'}
                  {p.status === 'done' && (p.driveUrl ? 'OK' : 'Salvo')}
                  {p.status === 'error' && (p.message ?? 'Erro')}
                  {p.status === 'skipped' && (p.message ?? 'Pendente Drive')}
                </span>
                {p.driveUrl && (
                  <a
                    href={p.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    Abrir ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
