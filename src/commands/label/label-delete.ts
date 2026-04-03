import { Command } from "@cliffy/command"
import { Confirm, Select } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import {
  ensureInteractiveConfirmationAvailable,
  shouldSkipConfirmation,
} from "../../utils/confirmation.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { getTeamKey } from "../../utils/linear.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { CliError, handleError, NotFoundError } from "../../utils/errors.ts"

const DeleteIssueLabel = gql(`
  mutation DeleteIssueLabel($id: String!) {
    issueLabelDelete(id: $id) {
      success
    }
  }
`)

const GetLabelByName = gql(`
  query GetLabelByName($name: String!, $teamKey: String) {
    issueLabels(
      filter: {
        name: { eqIgnoreCase: $name }
      }
    ) {
      nodes {
        id
        name
        color
        team {
          key
          name
        }
      }
    }
  }
`)

const GetLabelById = gql(`
  query GetLabelById($id: String!) {
    issueLabel(id: $id) {
      id
      name
      color
      team {
        key
        name
      }
    }
  }
`)

interface Label {
  id: string
  name: string
  color: string
  team?: { key: string; name: string } | null
}

async function resolveLabelId(
  // deno-lint-ignore no-explicit-any
  client: any,
  nameOrId: string,
  teamKey?: string,
  interactive?: boolean,
): Promise<Label | undefined> {
  // Try as UUID first
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nameOrId,
    )
  ) {
    try {
      const result = await client.request(GetLabelById, { id: nameOrId })
      if (result.issueLabel) {
        return result.issueLabel as Label
      }
    } catch {
      // Continue to name lookup
    }
  }

  // Try as name
  let labels: Label[] = []
  try {
    const result = await client.request(GetLabelByName, { name: nameOrId })
    labels = (result.issueLabels?.nodes || []) as Label[]
  } catch {
    // Query failed, label not found
    return undefined
  }

  if (labels.length === 0) {
    return undefined
  }

  // If team is specified, filter by team
  if (teamKey) {
    const teamLabel = labels.find(
      (l) => l.team?.key?.toLowerCase() === teamKey.toLowerCase(),
    )
    if (teamLabel) {
      return teamLabel
    }
    // Also check for workspace label
    const workspaceLabel = labels.find((l) => !l.team)
    if (workspaceLabel) {
      return workspaceLabel
    }
    return undefined
  }

  // If multiple labels with same name exist, let user choose
  if (labels.length > 1) {
    ensureInteractiveInputAvailable(
      { interactive },
      `Multiple labels named "${nameOrId}" found`,
      "Use --team to disambiguate, or pass --interactive to choose in a terminal.",
    )
    const options = labels.map((l) => ({
      name: `${l.name} (${l.team?.key || "Workspace"}) - ${l.color}`,
      value: l.id,
    }))

    const selectedId = await Select.prompt({
      message: `Multiple labels named "${nameOrId}" found. Which one?`,
      options,
    })

    return labels.find((l) => l.id === selectedId)
  }

  // Return first match (workspace labels typically)
  return labels[0]
}

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete an issue label")
  .arguments("<nameOrId:string>")
  .option("-i, --interactive", "Enable interactive selection and confirmation")
  .option(
    "-t, --team <teamKey:string>",
    "Team key to disambiguate labels with same name",
  )
  .option("-y, --yes", "Skip confirmation prompt")
  .option("-f, --force", "Deprecated alias for --yes")
  .action(async ({ interactive, team: teamKey, yes, force }, nameOrId) => {
    try {
      const client = getGraphQLClient()

      // Use configured team if not specified
      const effectiveTeamKey = teamKey || getTeamKey()

      // Resolve label
      const label = await resolveLabelId(
        client,
        nameOrId,
        effectiveTeamKey,
        interactive,
      )

      if (!label) {
        const suggestion = effectiveTeamKey
          ? `Searched in team ${effectiveTeamKey} and workspace.`
          : undefined
        throw new NotFoundError("Label", nameOrId, { suggestion })
      }

      const labelDisplay = `${label.name} (${label.team?.key || "Workspace"})`

      // Confirmation prompt unless a bypass flag is used
      if (!shouldSkipConfirmation({ yes, force })) {
        ensureInteractiveConfirmationAvailable({ interactive, yes, force })
        const confirmed = await Confirm.prompt({
          message: `Are you sure you want to delete label "${labelDisplay}"?`,
          default: false,
        })

        if (!confirmed) {
          console.log("Deletion canceled")
          return
        }
      }

      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner()
      const spinner = showSpinner ? new Spinner() : null
      spinner?.start()

      try {
        const result = await client.request(DeleteIssueLabel, {
          id: label.id,
        })
        spinner?.stop()

        if (result.issueLabelDelete.success) {
          console.log(`✓ Deleted label: ${labelDisplay}`)
        } else {
          throw new CliError("Failed to delete label")
        }
      } catch (error) {
        spinner?.stop()
        throw error
      }
    } catch (error) {
      handleError(error, "Failed to delete label")
    }
  })
