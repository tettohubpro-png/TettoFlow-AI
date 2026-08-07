import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'

/**
 * Página de destino do link de "recuperar senha" enviado por e-mail. O
 * Supabase autentica a sessão a partir do token na URL antes de chegarmos
 * aqui; só precisamos coletar a nova senha e confirmar.
 */
export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('A senha precisa ter no mínimo 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) setError(err)
    else setDone(true)
  }

  return (
    <AuthLayout subtitle="Defina uma nova senha para sua conta">
      {done ? (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
          >
            Senha atualizada com sucesso.
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="tf-btn tf-btn-primary w-full"
          >
            Ir para o painel
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p
              className="rounded-[10px] px-3 py-2 text-sm"
              style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}
            >
              {error}
            </p>
          )}

          <label className="block">
            <span className="tf-label">Nova senha</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="tf-input"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute top-1/2 flex -translate-y-1/2 items-center"
                style={{ right: 12, color: 'var(--color-text3)', background: 'none', border: 'none' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="tf-label">Confirmar nova senha</span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="tf-input"
            />
          </label>

          <button type="submit" disabled={loading} className="tf-btn tf-btn-primary w-full">
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
