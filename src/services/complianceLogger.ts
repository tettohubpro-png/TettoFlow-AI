import { createClient } from '@supabase/supabase-js'

/**
 * ComplianceLogger — Auditoria centralizada para ADR-001 e ADR-002
 * Todas operações críticas geram logs de auditoria com contexto completo
 * Conforme DOCUMENTATION/01-ADR/ADR-002-rag-access-control.md (Camada 4)
 */

export interface AuditLogEntry {
  user_id: string
  user_role: string
  action: 'login' | 'logout' | 'access_denied' | 'data_access' | 'ai_query' | 'approval' | 'export' | 'delete'
  resource_type: 'client' | 'operation' | 'conversation' | 'contract' | 'ai_embedding'
  resource_id?: string
  client_id?: string
  status: 'success' | 'denied' | 'error'
  reason?: string
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export class ComplianceLogger {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient
  }

  /**
   * Log acesso a dados críticos
   * Chamado após qualquer query bem-sucedida a tabela sensível
   */
  async logDataAccess(entry: Omit<AuditLogEntry, 'timestamp'>) {
    const auditLog: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }

    const { error } = await this.supabase
      .from('audit_logs')
      .insert([auditLog])

    if (error) {
      console.error('[ComplianceLogger] Erro ao logar acesso:', error)
    }
  }

  /**
   * Log interação IA (para ai_interaction_logs)
   * ADR-002: Camada 4 - Auditoria
   */
  async logAiInteraction(params: {
    client_id: string
    channel: 'whatsapp' | 'internal' | 'instagram'
    conversation_id?: string
    user_id?: string
    segment?: string
    intent_class?: string
    handoff: boolean
    handoff_reason?: string
    model_used: string
    tokens_in: number
    tokens_out: number
  }) {
    const { error } = await this.supabase
      .from('ai_interaction_logs')
      .insert([
        {
          ...params,
          created_at: new Date().toISOString(),
        },
      ])

    if (error) {
      console.error('[ComplianceLogger] Erro ao logar interação IA:', error)
    }
  }

  /**
   * Log tentativa de acesso negado (possível violation)
   */
  async logAccessDenied(params: {
    user_id: string
    user_role: string
    attempted_resource: string
    client_id?: string
    reason: string
  }) {
    await this.logDataAccess({
      ...params,
      action: 'access_denied',
      resource_type: 'client',
      status: 'denied',
    })
  }

  /**
   * Log login
   */
  async logLogin(userId: string, userRole: string) {
    await this.logDataAccess({
      user_id: userId,
      user_role: userRole,
      action: 'login',
      resource_type: 'client',
      status: 'success',
    })
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, userRole: string) {
    await this.logDataAccess({
      user_id: userId,
      user_role: userRole,
      action: 'logout',
      resource_type: 'client',
      status: 'success',
    })
  }

  /**
   * Log aprovação (Fase 0+)
   */
  async logApproval(params: {
    user_id: string
    user_role: string
    operation_id: string
    client_id: string
    approved: boolean
    reason?: string
  }) {
    await this.logDataAccess({
      user_id: params.user_id,
      user_role: params.user_role,
      action: 'approval',
      resource_type: 'operation',
      resource_id: params.operation_id,
      client_id: params.client_id,
      status: params.approved ? 'success' : 'denied',
      reason: params.reason,
    })
  }

  /**
   * Log query RAG com hash (não conteúdo)
   * ADR-002: Camada 2 e 4
   */
  async logRagQuery(params: {
    user_id: string
    user_role: string
    query_text_hash: string // SHA-256 da query
    retrieved_chunk_ids: string[]
    filtered_out_count: number
    client_scope: string[]
  }) {
    const { error } = await this.supabase
      .from('ai_rag_query_logs')
      .insert([
        {
          ...params,
          created_at: new Date().toISOString(),
        },
      ])

    if (error) {
      console.error('[ComplianceLogger] Erro ao logar RAG query:', error)
    }
  }
}
