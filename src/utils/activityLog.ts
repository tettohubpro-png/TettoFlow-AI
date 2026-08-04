import { supabase } from '@/lib/supabase'

export async function logProjectActivity(
  workspaceId: string,
  actorId: string | null,
  entityType: string,
  entityId: string | null,
  action: string,
  detail: Record<string, unknown> = {},
) {
  await supabase.from('project_activity').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    detail,
  })
}
