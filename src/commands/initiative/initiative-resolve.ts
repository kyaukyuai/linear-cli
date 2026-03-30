import {
  GetInitiativeByNameForStatusUpdateDocument,
  GetInitiativeBySlugForStatusUpdateDocument,
} from "../../__codegen__/graphql.ts"
import { NotFoundError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export async function resolveInitiativeId(
  initiativeIdOrSlugOrName: string,
  client = getGraphQLClient(),
): Promise<string> {
  if (isUuid(initiativeIdOrSlugOrName)) {
    return initiativeIdOrSlugOrName
  }

  try {
    const slugResult = await client.request(
      GetInitiativeBySlugForStatusUpdateDocument,
      {
        slugId: initiativeIdOrSlugOrName,
      },
    )

    const slugMatch = slugResult.initiatives?.nodes?.[0]?.id
    if (slugMatch != null) {
      return slugMatch
    }
  } catch {
    // Continue to case-insensitive name lookup.
  }

  try {
    const nameResult = await client.request(
      GetInitiativeByNameForStatusUpdateDocument,
      {
        name: initiativeIdOrSlugOrName,
      },
    )

    const nameMatch = nameResult.initiatives?.nodes?.[0]?.id
    if (nameMatch != null) {
      return nameMatch
    }
  } catch {
    // Fall through to the final not-found error below.
  }

  throw new NotFoundError("Initiative", initiativeIdOrSlugOrName)
}
