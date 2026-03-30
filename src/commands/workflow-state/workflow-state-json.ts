type WorkflowStateTeamLike = {
  id: string
  key: string
  name: string
}

type InheritedWorkflowStateLike = {
  id: string
  name: string
  type: string
}

type WorkflowStateLike = {
  id: string
  name: string
  type: string
  position: number
  color: string
  description?: string | null
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  team?: WorkflowStateTeamLike | null
  inheritedFrom?: InheritedWorkflowStateLike | null
}

export function buildWorkflowStateJsonPayload(
  workflowState: WorkflowStateLike,
) {
  return {
    id: workflowState.id,
    name: workflowState.name,
    type: workflowState.type,
    position: workflowState.position,
    color: workflowState.color,
    description: workflowState.description ?? null,
    createdAt: workflowState.createdAt,
    updatedAt: workflowState.updatedAt,
    archivedAt: workflowState.archivedAt ?? null,
    team: workflowState.team
      ? {
        id: workflowState.team.id,
        key: workflowState.team.key,
        name: workflowState.team.name,
      }
      : null,
    inheritedFrom: workflowState.inheritedFrom
      ? {
        id: workflowState.inheritedFrom.id,
        name: workflowState.inheritedFrom.name,
        type: workflowState.inheritedFrom.type,
      }
      : null,
  }
}
