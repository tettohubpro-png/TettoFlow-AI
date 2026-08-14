import { useState } from 'react'
import { X } from 'lucide-react'
import { useAccessControl } from '@/hooks/useAccessControl'
import { approveAccess, blockAccess } from '@/services/teamAdmin'
import { ASSIGNABLE_ROLES, JOB_ROLE_LABELS, JOB_ROLE_ORDER, ROLE_LABELS } from '@/utils/permissions'
import type { AccessStatus, JobRole, MembershipRole } from '@/types/database'

type AssignableRole = Extract<MembershipRole, 'MANAGER' | 'MEMBER'>

interface AccessControlModalProps {
  open: boolean
  onClose: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  email: 'Senha',
}

function providerBadges(raw: string | null): string[] {
  if (!raw) return ['Sem login ainda']
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => PROVIDER_LABELS[p] ?? p)
}

const STATUS_META: Record<AccessStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pendente', bg: 'var(--color-warning-dim)', fg: 'var(--color-warning)' },
  active: { label: 'Ativo', bg: 'var(--color-success-dim)', fg: 'var(--color-success)' },
  blocked: { label: 'Bloqueado', bg: 'var(--color-danger-dim)', fg: 'var(--color-danger)' },
}

export function AccessControlModal({ open, onClose }: AccessControlModalProps) {
  const { users, loading, error, refresh } = useAccessControl(open)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pickerId, setPickerId] = useState<string | null>(null)
  const [pickerRole, setPickerRole] = useState<AssignableRole>('MEMBER')
  const [pickerJobRole, setPickerJobRole] = useState<JobRole | ''>('')
  const [actionError, setActionError] = useState<string | null>(null)

  if (!open) return null

  const openPicker = (userId: string) => {
    setPickerId(userId)
    setPickerRole('MEMBER')
    setPickerJobRole('')
    setActionError(null)
  }

  const confirmApprove = async (userId: string) => {
    setBusyId(userId)
    setActionError(null)
    const result = await approveAccess({
      user_id: userId,
      role: pickerRole,
      job_role: pickerJobRole || null,
    })
    setBusyId(null)
    if (result.error) {
      setActionError(result.error)
      return
    }
    setPickerId(null)
    await refresh()
  }

  const handleBlock = async (userId: string, name: string) => {
    if (!confirm(`Bloquear o acesso de ${name}? A pessoa perde o login imediatamente.`)) return
    setBusyId(userId)
    setActionError(null)
    const result = await blockAccess(userId)
    setBusyId(null)
    if (result.error) {
      setActionError(result.error)
      return
    }
    await refresh()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 6, 24, 0.82)' }}
      onClick={onClose}
    >
      <div
        className="tf-window flex max-h-[85vh] w-full max-w-2xl flex-col p-0"
        style={{ background: 'var(--color-bg2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-start justify-between gap-3 border-b p-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="tf-eyebrow">Equipe</p>
            <h2 className="text-lg font-bold">Controle de acesso</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text3)', maxWidth: 440 }}>
              Todo mundo que já tentou entrar (Google, senha ou outro provedor) aparece aqui. Só quem
              você aprovar consegue acessar o sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="tf-btn tf-btn-ghost shrink-0"
            style={{ width: 36, height: 36, padding: 0 }}
          >
            <X size={16} />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          {(error || actionError) && (
            <p
              className="mb-3 rounded-[10px] px-3 py-2 text-sm"
              style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}
            >
              {error || actionError}
            </p>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
              Carregando…
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
              Ninguém tentou entrar ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const meta = STATUS_META[u.access_status] ?? STATUS_META.pending
                const isMaster = u.role === 'OWNER' || u.role === 'ADMIN'
                return (
                  <li key={u.id} className="tf-panel p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="tf-avatar shrink-0" aria-hidden>
                        {(u.name || u.email || '?')
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? '')
                          .join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {u.name}{' '}
                          {u.is_self && (
                            <span className="text-xs font-normal" style={{ color: 'var(--color-text3)' }}>
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs" style={{ color: 'var(--color-text3)' }}>
                          {u.email}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {providerBadges(u.auth_provider).map((label) => (
                            <span
                              key={label}
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ background: 'var(--color-bg4)', color: 'var(--color-text2)' }}
                            >
                              {label}
                            </span>
                          ))}
                          {u.role && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
                            >
                              {ROLE_LABELS[u.role]}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: meta.bg, color: meta.fg }}
                      >
                        {meta.label}
                      </span>

                      {!u.is_self && !isMaster && (
                        <div className="flex shrink-0 gap-2">
                          {u.access_status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => openPicker(u.id)}
                              disabled={busyId === u.id}
                              className="tf-btn tf-btn-soft"
                              style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
                            >
                              {u.access_status === 'blocked' ? 'Reativar' : 'Aprovar'}
                            </button>
                          )}
                          {u.access_status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleBlock(u.id, u.name)}
                              disabled={busyId === u.id}
                              className="tf-btn tf-btn-ghost"
                              style={{ minHeight: 32, padding: '0 12px', fontSize: 12, color: 'var(--color-danger)' }}
                            >
                              Bloquear
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {pickerId === u.id && (
                      <div
                        className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <label className="min-w-[120px] flex-1">
                          <span className="tf-label">Papel</span>
                          <select
                            className="tf-select"
                            value={pickerRole}
                            onChange={(e) => setPickerRole(e.target.value as AssignableRole)}
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-[140px] flex-1">
                          <span className="tf-label">Função operacional</span>
                          <select
                            className="tf-select"
                            value={pickerJobRole}
                            onChange={(e) => setPickerJobRole(e.target.value as JobRole | '')}
                          >
                            <option value="">Sem função</option>
                            {JOB_ROLE_ORDER.map((jr) => (
                              <option key={jr} value={jr}>
                                {JOB_ROLE_LABELS[jr]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => confirmApprove(u.id)}
                          disabled={busyId === u.id}
                          className="tf-btn tf-btn-primary"
                          style={{ minHeight: 36 }}
                        >
                          {busyId === u.id ? 'Salvando…' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerId(null)}
                          className="tf-btn tf-btn-ghost"
                          style={{ minHeight: 36 }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
