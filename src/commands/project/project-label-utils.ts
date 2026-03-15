import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { ValidationError } from "../../utils/errors.ts"

const GetProjectLabelById = gql(`
  query GetProjectLabelById($id: String!) {
    projectLabel(id: $id) {
      id
      name
      description
      color
      isGroup
      archivedAt
      retiredAt
      parent {
        id
        name
      }
    }
  }
`)

const SearchProjectLabelsByName = gql(`
  query SearchProjectLabelsByName($name: String!, $includeArchived: Boolean) {
    projectLabels(
      first: 50
      includeArchived: $includeArchived
      filter: { name: { eqIgnoreCase: $name } }
    ) {
      nodes {
        id
        name
        description
        color
        isGroup
        archivedAt
        retiredAt
        parent {
          id
          name
        }
      }
    }
  }
`)

export type ResolvedProjectLabel = {
  id: string
  name: string
  description?: string | null
  color: string
  isGroup: boolean
  archivedAt?: string | null
  retiredAt?: string | null
  parent?: { id: string; name: string } | null
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export async function resolveProjectLabel(
  nameOrId: string,
  options: {
    client?: ReturnType<typeof getGraphQLClient>
    includeArchived?: boolean
  } = {},
): Promise<ResolvedProjectLabel | undefined> {
  const client = options.client ?? getGraphQLClient()

  if (looksLikeUuid(nameOrId)) {
    try {
      const result = await client.request(GetProjectLabelById, { id: nameOrId })
      if (result.projectLabel != null) {
        return result.projectLabel
      }
    } catch {
      // Fall through to the name lookup for user-friendly handling.
    }
  }

  const result = await client.request(SearchProjectLabelsByName, {
    name: nameOrId,
    includeArchived: options.includeArchived ?? true,
  })

  const labels = result.projectLabels.nodes
  if (labels.length === 0) {
    return undefined
  }

  if (labels.length > 1) {
    throw new ValidationError(
      `Multiple project labels named "${nameOrId}" found`,
      {
        suggestion:
          "Use the project label UUID from `linear project-label list`.",
      },
    )
  }

  return labels[0]
}
