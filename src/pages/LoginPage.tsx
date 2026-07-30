import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err)
    else navigate('/')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-8 safe-pt safe-pb">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          TettoHub
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">TettoFlow AI OS</h1>
        <p className="mt-1 text-sm text-slate-400">Entre com sua conta da agência</p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <label className="mt-6 block text-sm text-slate-300">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
          />
        </label>

        <label className="mt-4 block text-sm text-slate-300">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 min-h-12 w-full rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
