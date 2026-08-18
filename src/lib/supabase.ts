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

// Tipo do client real usado no app — outros módulos (ex: ComplianceLogger)
// devem tipar o parâmetro do client com ESTE tipo, nunca com
// `ReturnType<typeof createClient>` derivado de novo: createClient tem mais
// de uma sobrecarga, e `ReturnType<>` num tipo de função sobrecarregada
// resolve pra ÚLTIMA sobrecarga (mais recente/estrita da lib), que não bate
// estruturalmente com a instância de fato criada acima — causava erro de
// tipo "SupabaseClient<...> não é atribuível a SupabaseClient<...>" mesmo
// sendo o mesmo client em runtime.
export type SupabaseClientType = typeof supabase
