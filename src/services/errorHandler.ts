/**
 * ErrorHandler — Gestão centralizada de erros com contexto
 * Melhora mensagens genéricas para orientar usuário no que fazer
 */

export interface ErrorContext {
  type: 'isolation' | 'permission' | 'timeout' | 'network' | 'validation' | 'not_found' | 'conflict' | 'unknown'
  message: string
  code?: string
  originalError?: Error | string
  userAction?: string // O que o usuário deve fazer
  canRetry?: boolean
  retryAfterMs?: number
}

export class StructuredError extends Error {
  context: ErrorContext

  constructor(context: ErrorContext) {
    super(context.message)
    this.context = context
    this.name = 'StructuredError'
  }

  /**
   * Mensagem amigável para exibir no toast
   */
  getUserMessage(): string {
    const parts: string[] = [this.context.message]

    if (this.context.userAction) {
      parts.push(`Ação: ${this.context.userAction}`)
    }

    if (this.context.canRetry) {
      parts.push('💡 Tente novamente em alguns instantes')
    }

    return parts.join(' • ')
  }

  /**
   * Log estruturado para auditoria
   */
  toAuditLog() {
    return {
      type: this.context.type,
      code: this.context.code,
      message: this.context.message,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Classifica erro Supabase/RLS
 */
export function classifySupabaseError(error: any): ErrorContext {
  const message = error?.message ?? 'Erro desconhecido'
  const code = error?.code ?? 'UNKNOWN'

  // RLS denied
  if (code === 'PGRST116' || message.includes('permission denied')) {
    return {
      type: 'isolation',
      code,
      message: 'Você não tem permissão para acessar estes dados',
      userAction: 'Verifique suas permissões com o administrador',
      canRetry: false,
    }
  }

  // Row not found
  if (code === 'PGRST116' || message.includes('not found')) {
    return {
      type: 'not_found',
      code,
      message: 'Recurso não encontrado ou foi removido',
      userAction: 'Recarregue a página e verifique se o item ainda existe',
      canRetry: true,
      retryAfterMs: 1000,
    }
  }

  // Network/timeout
  if (
    code === 'NetworkError' ||
    message.includes('timeout') ||
    message.includes('ECONNREFUSED') ||
    message.includes('network')
  ) {
    return {
      type: 'network',
      code,
      message: 'Falha de conexão com o servidor',
      userAction: 'Verifique sua conexão e tente novamente',
      canRetry: true,
      retryAfterMs: 2000,
    }
  }

  // Conflict (ex: unique constraint)
  if (code === '23505' || message.includes('duplicate') || message.includes('conflict')) {
    return {
      type: 'conflict',
      code,
      message: 'Este item já existe',
      userAction: 'Tente com um nome ou identificador diferente',
      canRetry: false,
    }
  }

  // Validation error
  if (code === '22P02' || message.includes('invalid')) {
    return {
      type: 'validation',
      code,
      message: 'Dados inválidos enviados',
      userAction: 'Verifique os campos preenchidos',
      canRetry: false,
    }
  }

  // Default: unknown
  return {
    type: 'unknown',
    code,
    message,
    userAction: 'Se o problema persistir, contate o suporte',
    canRetry: true,
    retryAfterMs: 3000,
  }
}

/**
 * Classifica erros de autenticação
 */
export function classifyAuthError(error: any): ErrorContext {
  const message = error?.message ?? 'Erro de autenticação'

  if (message.includes('Invalid login credentials')) {
    return {
      type: 'validation',
      message: 'Email ou senha incorretos',
      userAction: 'Verifique suas credenciais',
      canRetry: false,
    }
  }

  if (message.includes('Email not confirmed')) {
    return {
      type: 'permission',
      message: 'Email não confirmado',
      userAction: 'Verifique seu email e clique no link de confirmação',
      canRetry: false,
    }
  }

  if (message.includes('User already registered')) {
    return {
      type: 'conflict',
      message: 'Usuário já registrado',
      userAction: 'Tente fazer login ou recuperar sua senha',
      canRetry: false,
    }
  }

  if (message.includes('rate limit')) {
    return {
      type: 'timeout',
      message: 'Muitas tentativas. Tente novamente mais tarde',
      userAction: 'Aguarde alguns minutos',
      canRetry: true,
      retryAfterMs: 60000, // 1 min
    }
  }

  return {
    type: 'unknown',
    message,
    userAction: 'Tente novamente ou contate o suporte',
    canRetry: true,
  }
}

/**
 * Handler genérico para catch blocks
 */
export function handleError(error: unknown, _context?: string): StructuredError {
  // Se já é StructuredError, retorna
  if (error instanceof StructuredError) {
    return error
  }

  // Se é erro Supabase
  if (error && typeof error === 'object' && 'code' in error) {
    return new StructuredError(classifySupabaseError(error))
  }

  // Se é string
  if (typeof error === 'string') {
    return new StructuredError({
      type: 'unknown',
      message: error,
      userAction: 'Tente novamente',
      canRetry: true,
    })
  }

  // Default
  return new StructuredError({
    type: 'unknown',
    message: 'Erro inesperado',
    userAction: 'Recarregue a página ou contate o suporte',
    canRetry: true,
  })
}
