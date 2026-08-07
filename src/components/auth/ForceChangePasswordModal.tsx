import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/** Bloqueia o app até o usuário trocar a senha inicial. */
export function ForceChangePasswordModal() {
  const { mustChangePassword, updatePassword, clearMustChangePassword, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!mustChangePassword) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (password === 'admin123') {
      setError('Escolha uma senha diferente da senha inicial.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setSaving(true)
    const upd = await updatePassword(password)
    if (upd.error) {
      setSaving(false)
      setError(upd.error)
      return
    }
    const clear = await clearMustChangePassword()
    setSaving(false)
    if (clear.error) setError(clear.error)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 6, 24, 0.82)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="tf-window w-full max-w-md p-6"
        style={{ background: 'var(--color-bg2)' }}
      >
        <p className="tf-eyebrow">Primeiro acesso</p>
        <h2 className="mt-2 text-xl font-bold">Defina uma nova senha</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text3)' }}>
          Por segurança, troque a senha inicial antes de continuar.
        </p>

        {error && (
          <p
            className="mt-4 rounded-[10px] px-3 py-2 text-sm"
            style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}
          >
            {error}
          </p>
        )}

        <label className="mt-5 block">
          <span className="tf-label">Nova senha</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="tf-input"
            minLength={8}
          />
        </label>

        <label className="mt-3 block">
          <span className="tf-label">Confirmar senha</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="tf-input"
            minLength={8}
          />
        </label>

        <button type="submit" disabled={saving} className="tf-btn tf-btn-primary mt-5 w-full">
          {saving ? 'Salvando…' : 'Salvar nova senha'}
        </button>

        <button
          type="button"
          onClick={() => signOut()}
          className="tf-btn tf-btn-ghost mt-2 w-full"
        >
          Sair
        </button>
      </form>
    </div>
  )
}
