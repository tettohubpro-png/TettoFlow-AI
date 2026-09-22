import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'TettoFlow: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
)

// Garante que o canal Realtime sempre use o token de acesso mais atual.
// O client já faz isso internamente na maioria dos casos, mas em abas que
// ficam muito tempo em segundo plano o timer de refresh pode atrasar — isso
// reforça manualmente toda vez que a sessão muda (login, refresh, logout).
supabase.auth.onAuthStateChange((_event, session) => {
  supabase.realtime.setAuth(session?.access_token ?? null)
})
