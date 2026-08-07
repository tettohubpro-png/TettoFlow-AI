import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err)
    else setSent(true)
  }

  return (
    <AuthLayout subtitle="Enviaremos um link para redefinir sua senha">
      <Link
        to="/login"
        className="mb-6 flex items-center gap-1.5 text-xs"
        style={{ color: 'var(--color-text3)' }}
      >
        <ArrowLeft size={12} /> Voltar ao login
      </Link>

      {sent ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
        >
          Se houver uma conta com o e-mail <strong>{email}</strong>, enviamos um link de
          redefinição. Confira sua caixa de entrada (e o spam).
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
            <span className="tf-label">E-mail</span>
            <div className="relative">
              <Mail
                size={13}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text3)' }}
              />
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tf-input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </label>

          <button type="submit" disabled={loading} className="tf-btn tf-btn-primary w-full">
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
