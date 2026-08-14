import { useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Settings, UserPlus } from 'lucide-react'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useClientAssignments } from '@/hooks/useClientAssignments'
import { useAuth } from '@/contexts/AuthContext'
import {
  ASSIGNABLE_ROLES,
  JOB_ROLE_LABELS,
  JOB_ROLE_ORDER,
  ROLE_LABELS,
  canManageTeam,
} from '@/utils/permissions'
import type { JobRole, MembershipRole } from '@/types/database'
import { DEPARTMENT_LABELS } from '@/utils/departments'
import {
  createTeamMember,
  deleteTeamMember,
  inviteTeamMember,
  updateTeamMemberRole,
} from '@/services/teamAdmin'
import { AccessControlModal } from '@/components/team/AccessControlModal'

export function TeamPage() {
  const { role, user } = useAuth()
  const { members, loading, error: loadError, refresh } = useTeamMembers()
  const { assignments, loading: loadingAssign } = useClientAssignments()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER' as Extract<MembershipRole, 'MANAGER' | 'MEMBER'>,
    job_role: '' as JobRole | '',
  })

  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteDone, setInviteDone] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'MEMBER' as Extract<MembershipRole, 'MANAGER' | 'MEMBER'>,
    job_role: '' as JobRole | '',
  })

  const [showAccessControl, setShowAccessControl] = useState(false)

  const canEdit = canManageTeam(role)

  const assignByUser = useMemo(() => {
    const map = new Map<string, typeof assignments>()
    for (const a of assignments) {
      const list = map.get(a.user_id) ?? []
      list.push(a)
      map.set(a.user_id, list)
    }
    return map
  }, [assignments])

  if (!canEdit) {
    return <Navigate to="/" replace />
  }

  const updateJobRole = async (membershipId: string, userId: string, jobRole: JobRole | '') => {
    const member = members.find((m) => m.membership_id === membershipId)
    if (!member || member.role === 'OWNER' || member.role === 'ADMIN') return
    setSavingId(membershipId)
    setError(null)
    const result = await updateTeamMemberRole({
      user_id: userId,
      role: member.role as 'MANAGER' | 'MEMBER',
      job_role: jobRole || null,
    })
    if (result.error) setError(result.error)
    else await refresh()
    setSavingId(null)
  }

  const changeRole = async (userId: string, nextRole: 'MANAGER' | 'MEMBER') => {
    setSavingId(userId)
    setError(null)
    const result = await updateTeamMemberRole({ user_id: userId, role: nextRole })
    if (result.error) setError(result.error)
    else await refresh()
    setSavingId(null)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    const result = await createTeamMember({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      job_role: form.job_role || null,
    })
    setCreating(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowForm(false)
    setForm({ name: '', email: '', password: '', role: 'MEMBER', job_role: '' })
    await refresh()
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name} da equipe? Esta ação não pode ser desfeita.`)) return
    setSavingId(userId)
    setError(null)
    const result = await deleteTeamMember(userId)
    if (result.error) setError(result.error)
    else await refresh()
    setSavingId(null)
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setInviteDone(null)
    const result = await inviteTeamMember({
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      job_role: inviteForm.job_role || null,
    })
    setInviting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setInviteDone(inviteForm.email.trim())
    setInviteForm({ name: '', email: '', role: 'MEMBER', job_role: '' })
    await refresh()
  }

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="tf-title text-xl sm:text-2xl">Equipe</h2>
          <p className="tf-subtitle mt-1">
            Somente o Master cria, convida e remove funcionários e gerentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowInvite((v) => !v)
              setShowForm(false)
            }}
            className="tf-btn tf-btn-ghost"
          >
            <UserPlus size={15} />
            {showInvite ? 'Cancelar' : 'Enviar convite'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v)
              setShowInvite(false)
            }}
            className="tf-btn tf-btn-primary"
          >
            {showForm ? 'Cancelar' : 'Novo usuário'}
          </button>
          <button
            type="button"
            onClick={() => setShowAccessControl(true)}
            aria-label="Controle de acesso"
            title="Controle de acesso"
            className="tf-btn tf-btn-ghost"
            style={{ width: 44, padding: 0 }}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {(error || loadError) && (
        <p className="mb-3 text-sm" style={{ color: 'var(--color-danger)' }}>
          {error || loadError}
        </p>
      )}

      {inviteDone && (
        <p
          className="mb-3 rounded-[10px] px-3 py-2 text-sm"
          style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
        >
          Convite enviado para {inviteDone}. Quando a pessoa aceitar, já entra com o papel definido.
        </p>
      )}

      {showInvite && (
        <form onSubmit={handleInvite} className="tf-window mb-6 grid gap-3 p-4 sm:grid-cols-2">
          <label>
            <span className="tf-label">Nome</span>
            <input
              className="tf-input"
              required
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            />
          </label>
          <label>
            <span className="tf-label">E-mail</span>
            <input
              type="email"
              className="tf-input"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
          </label>
          <label>
            <span className="tf-label">Papel</span>
            <select
              className="tf-select"
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  role: e.target.value as Extract<MembershipRole, 'MANAGER' | 'MEMBER'>,
                })
              }
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="tf-label">Função operacional</span>
            <select
              className="tf-select"
              value={inviteForm.job_role}
              onChange={(e) => setInviteForm({ ...inviteForm, job_role: e.target.value as JobRole | '' })}
            >
              <option value="">Sem função</option>
              {JOB_ROLE_ORDER.map((jr) => (
                <option key={jr} value={jr}>
                  {JOB_ROLE_LABELS[jr]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs sm:col-span-2" style={{ color: 'var(--color-text3)' }}>
            Enviamos um e-mail com um link de acesso. O papel e a função já ficam configurados —
            a pessoa só define a senha dela.
          </p>
          <div className="sm:col-span-2">
            <button type="submit" disabled={inviting} className="tf-btn tf-btn-primary">
              {inviting ? 'Enviando…' : 'Enviar convite'}
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="tf-window mb-6 grid gap-3 p-4 sm:grid-cols-2">
          <label>
            <span className="tf-label">Nome</span>
            <input
              className="tf-input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            <span className="tf-label">E-mail</span>
            <input
              type="email"
              className="tf-input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            <span className="tf-label">Senha temporária</span>
            <input
              type="password"
              className="tf-input"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            <span className="tf-label">Papel</span>
            <select
              className="tf-select"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as Extract<MembershipRole, 'MANAGER' | 'MEMBER'>,
                })
              }
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="tf-label">Função operacional</span>
            <select
              className="tf-select"
              value={form.job_role}
              onChange={(e) => setForm({ ...form, job_role: e.target.value as JobRole | '' })}
            >
              <option value="">Sem função</option>
              {JOB_ROLE_ORDER.map((jr) => (
                <option key={jr} value={jr}>
                  {JOB_ROLE_LABELS[jr]}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={creating} className="tf-btn tf-btn-primary">
              {creating ? 'Criando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      )}

      {loading || loadingAssign ? (
        <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
          Carregando…
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => {
            const linked = assignByUser.get(m.user_id) ?? []
            const isSelf = m.user_id === user?.id
            const isOwnerLike = m.role === 'OWNER' || m.role === 'ADMIN'
            return (
              <article key={m.membership_id} className="tf-panel p-4">
                <div className="flex items-start gap-3">
                  <div className="tf-avatar shrink-0" aria-hidden>
                    {(m.user.name ?? '?')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? '')
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.user.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--color-text3)' }}>
                      {m.user.email}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-text2)' }}>
                      {ROLE_LABELS[m.role as MembershipRole] ?? m.role}
                    </p>
                  </div>
                </div>

                {!isOwnerLike && (
                  <>
                    <label className="tf-label mt-4">Papel</label>
                    <select
                      className="tf-select"
                      value={m.role}
                      disabled={savingId === m.user_id}
                      onChange={(e) =>
                        changeRole(m.user_id, e.target.value as 'MANAGER' | 'MEMBER')
                      }
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    <label className="tf-label mt-3">Função operacional</label>
                    <select
                      className="tf-select"
                      value={m.job_role ?? ''}
                      disabled={savingId === m.membership_id}
                      onChange={(e) =>
                        updateJobRole(m.membership_id, m.user_id, e.target.value as JobRole | '')
                      }
                    >
                      <option value="">Sem função</option>
                      {JOB_ROLE_ORDER.map((jr) => (
                        <option key={jr} value={jr}>
                          {JOB_ROLE_LABELS[jr]}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <div className="mt-4">
                  <p className="tf-label">Clientes atribuídos ({linked.length})</p>
                  {linked.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                      Nenhum vínculo
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {linked.slice(0, 6).map((a) => (
                        <li
                          key={a.id}
                          className="truncate text-xs"
                          style={{ color: 'var(--color-text2)' }}
                        >
                          {a.clients?.name ?? 'Cliente'} ·{' '}
                          {DEPARTMENT_LABELS[a.department] ?? a.department}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {!isSelf && !isOwnerLike && (
                  <button
                    type="button"
                    disabled={savingId === m.user_id}
                    onClick={() => handleDelete(m.user_id, m.user.name)}
                    className="tf-btn tf-btn-ghost mt-4 w-full"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Remover usuário
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      <AccessControlModal open={showAccessControl} onClose={() => setShowAccessControl(false)} />
    </div>
  )
}
