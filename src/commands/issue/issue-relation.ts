import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  getIssueIdentifier,
  resolveIssueInternalId,
} from "../../utils/linear.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  CliError,
  isClientError,
  isNotFoundError,
  isWriteTimeoutError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
import { reconcileWriteTimeoutError } from "../../utils/write_reconciliation.ts"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"
import { buildIssueRelationDryRunPayload } from "./issue-dry-run-payload.ts"

const RELATION_TYPES = ["blocks", "blocked-by", "related", "duplicate"] as const
type RelationType = (typeof RELATION_TYPES)[number]

// Map CLI-friendly names to Linear API types
// Note: "blocked-by" is implemented by reversing the issue order with "blocks"
function getApiRelationType(
  type: RelationType,
): "blocks" | "related" | "duplicate" {
  if (type === "blocked-by") return "blocks"
  return type
}

function getDisplayRelationType(
  type: string,
  direction: "outgoing" | "incoming",
): string {
  if (direction === "incoming" && type === "blocks") {
    return "blocked-by"
  }
  return type
}

type RelationIssueRef = {
  id: string
  identifier: string
}

type RelationMutationPayload = {
  success: boolean
  noOp: boolean
  direction: "outgoing" | "incoming"
  relationType: RelationType
  issue: RelationIssueRef
  relatedIssue: RelationIssueRef
  relationId: string | null
}

type FindRelationQueryResult = {
  issue: {
    relations: {
      nodes: Array<{
        id: string
        type: string
        relatedIssue: {
          id: string
        }
      }>
    }
  } | null
}

const FindIssueRelation = gql(`
  query FindIssueRelation($issueId: String!) {
    issue(id: $issueId) {
      relations {
        nodes {
          id
          type
          relatedIssue { id }
        }
      }
    }
  }
`)

const CreateIssueRelation = gql(`
  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
      }
    }
  }
`)

const DeleteIssueRelation = gql(`
  mutation DeleteIssueRelation($id: String!) {
    issueRelationDelete(id: $id) {
      success
    }
  }
`)

async function resolveRelationIssueRefs(
  issueIdArg: string,
  relatedIssueIdArg: string,
): Promise<{
  issue: RelationIssueRef
  relatedIssue: RelationIssueRef
}> {
  const issueIdentifier = await getIssueIdentifier(issueIdArg)
  if (!issueIdentifier) {
    throw new ValidationError(
      `Could not resolve issue identifier: ${issueIdArg}`,
    )
  }

  const relatedIssueIdentifier = await getIssueIdentifier(relatedIssueIdArg)
  if (!relatedIssueIdentifier) {
    throw new ValidationError(
      `Could not resolve issue identifier: ${relatedIssueIdArg}`,
    )
  }

  return {
    issue: {
      id: await resolveRelationIssueId(issueIdentifier),
      identifier: issueIdentifier,
    },
    relatedIssue: {
      id: await resolveRelationIssueId(relatedIssueIdentifier),
      identifier: relatedIssueIdentifier,
    },
  }
}

async function resolveRelationIssueId(identifier: string): Promise<string> {
  try {
    return await resolveIssueInternalId(identifier)
  } catch (error) {
    if (isClientError(error) && isNotFoundError(error)) {
      throw new NotFoundError("Issue", identifier)
    }
    throw error
  }
}

function buildRelationMutationPayload(
  issue: RelationIssueRef,
  relatedIssue: RelationIssueRef,
  relationType: RelationType,
  relationId: string | null,
  noOp: boolean,
): RelationMutationPayload {
  return {
    success: true,
    noOp,
    direction: relationType === "blocked-by" ? "incoming" : "outgoing",
    relationType,
    issue,
    relatedIssue,
    relationId,
  }
}

function buildRelationReceipt(
  payload: RelationMutationPayload,
  action: "add" | "delete",
) {
  return buildOperationReceipt({
    operationId: `issue.relation.${action}`,
    resource: "issue_relation",
    action,
    resolvedRefs: {
      issueIdentifier: payload.issue.identifier,
      relatedIssueIdentifier: payload.relatedIssue.identifier,
      relationType: payload.relationType,
    },
    appliedChanges: payload.noOp
      ? []
      : [action === "add" ? "relation" : "relationRemoval"],
    noOp: payload.noOp,
    nextSafeAction: "continue",
  })
}

async function findExistingRelation(
  issueId: string,
  relatedIssueId: string,
  relationType: RelationType,
): Promise<string | null> {
  const client = getGraphQLClient()
  const apiType = getApiRelationType(relationType)
  const [fromId, toId] = relationType === "blocked-by"
    ? [relatedIssueId, issueId]
    : [issueId, relatedIssueId]

  const data = await client.request<FindRelationQueryResult>(
    FindIssueRelation,
    {
      issueId: fromId,
    },
  )

  const relation = data.issue?.relations.nodes.find((candidate) =>
    candidate.type === apiType && candidate.relatedIssue.id === toId
  )

  return relation?.id ?? null
}

const addRelationCommand = new Command()
  .name("add")
  .description("Add a relation between two issues")
  .arguments("<issueId:string> <relationType:string> <relatedIssueId:string>")
  .option("-j, --json", "Output as JSON")
  .option("--dry-run", "Preview relation creation without mutating Linear")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to add issue relation",
    )
  })
  .example(
    "Mark issue as blocked by another",
    "linear issue relation add ENG-123 blocked-by ENG-100",
  )
  .example(
    "Mark issue as blocking another",
    "linear issue relation add ENG-123 blocks ENG-456",
  )
  .example(
    "Mark issues as related",
    "linear issue relation add ENG-123 related ENG-456",
  )
  .example(
    "Mark issue as duplicate",
    "linear issue relation add ENG-123 duplicate ENG-100",
  )
  .action(
    async (
      { json, dryRun, timeoutMs },
      issueIdArg,
      relationTypeArg,
      relatedIssueIdArg,
    ) => {
      try {
        const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
        const relationType = relationTypeArg.toLowerCase() as RelationType
        if (!RELATION_TYPES.includes(relationType)) {
          throw new ValidationError(
            `Invalid relation type: ${relationTypeArg}`,
            { suggestion: `Must be one of: ${RELATION_TYPES.join(", ")}` },
          )
        }

        const { issue, relatedIssue } = await resolveRelationIssueRefs(
          issueIdArg,
          relatedIssueIdArg,
        )
        const previewPayload = buildIssueRelationDryRunPayload({
          command: "issue.relation.add",
          direction: relationType === "blocked-by" ? "incoming" : "outgoing",
          relationType,
          issue,
          relatedIssue,
        })
        if (dryRun) {
          emitDryRunOutput({
            json,
            summary:
              `Would create relation: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
            data: previewPayload,
            lines: [
              `Issue: ${issue.identifier}`,
              `Related issue: ${relatedIssue.identifier}`,
              `Relation: ${relationType}`,
            ],
          })
          return
        }

        const data = await withSpinner(
          () => {
            return findExistingRelation(issue.id, relatedIssue.id, relationType)
          },
          { enabled: !json },
        )

        let payload: RelationMutationPayload
        if (data != null) {
          payload = buildRelationMutationPayload(
            issue,
            relatedIssue,
            relationType,
            data,
            true,
          )
        } else {
          const client = getGraphQLClient()
          const apiType = getApiRelationType(relationType)
          const [fromId, toId] = relationType === "blocked-by"
            ? [relatedIssue.id, issue.id]
            : [issue.id, relatedIssue.id]

          let createData
          try {
            createData = await withSpinner(
              () =>
                withWriteTimeout(
                  (signal) =>
                    client.request({
                      document: CreateIssueRelation,
                      variables: {
                        input: {
                          issueId: fromId,
                          relatedIssueId: toId,
                          type: apiType,
                        },
                      },
                      signal,
                    }),
                  {
                    operation: "issue relation creation",
                    timeoutMs: writeTimeoutMs,
                    suggestion: buildWriteTimeoutSuggestion(),
                  },
                ),
              { enabled: !json },
            )
          } catch (error) {
            if (isWriteTimeoutError(error)) {
              await reconcileWriteTimeoutError(error, async () => {
                const reconciledRelationId = await findExistingRelation(
                  issue.id,
                  relatedIssue.id,
                  relationType,
                )

                if (reconciledRelationId != null) {
                  return {
                    outcome: "probably_succeeded",
                    suggestion:
                      "Linear now shows the relation. Treat this write as succeeded; retrying it would be a no-op.",
                    details: {
                      relationId: reconciledRelationId,
                      relationObserved: true,
                    },
                  }
                }

                return {
                  outcome: "definitely_failed",
                  suggestion:
                    "Linear does not yet show the relation. Re-check the issues before retrying this write.",
                  details: {
                    relationObserved: false,
                  },
                }
              })
            }
            throw error
          }

          if (!createData.issueRelationCreate.success) {
            throw new CliError("Failed to create relation")
          }

          payload = buildRelationMutationPayload(
            issue,
            relatedIssue,
            relationType,
            createData.issueRelationCreate.issueRelation?.id ?? null,
            false,
          )
        }

        if (json) {
          console.log(JSON.stringify(
            withOperationReceipt(payload, buildRelationReceipt(payload, "add")),
            null,
            2,
          ))
          return
        }

        if (payload.noOp) {
          console.log(
            `✓ Relation already exists: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
          )
          return
        }

        console.log(
          `✓ Created relation: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
        )
      } catch (error) {
        handleAutomationCommandError(error, "Failed to create relation", json)
      }
    },
  )

const deleteRelationCommand = new Command()
  .name("delete")
  .description("Delete a relation between two issues")
  .arguments("<issueId:string> <relationType:string> <relatedIssueId:string>")
  .option("-j, --json", "Output as JSON")
  .option("--dry-run", "Preview relation deletion without mutating Linear")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to delete issue relation",
    )
  })
  .action(
    async (
      { json, dryRun, timeoutMs },
      issueIdArg,
      relationTypeArg,
      relatedIssueIdArg,
    ) => {
      try {
        const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
        const relationType = relationTypeArg.toLowerCase() as RelationType
        if (!RELATION_TYPES.includes(relationType)) {
          throw new ValidationError(
            `Invalid relation type: ${relationTypeArg}`,
            { suggestion: `Must be one of: ${RELATION_TYPES.join(", ")}` },
          )
        }
        const { issue, relatedIssue } = await resolveRelationIssueRefs(
          issueIdArg,
          relatedIssueIdArg,
        )
        const previewPayload = buildIssueRelationDryRunPayload({
          command: "issue.relation.delete",
          direction: relationType === "blocked-by" ? "incoming" : "outgoing",
          relationType,
          issue,
          relatedIssue,
        })
        if (dryRun) {
          emitDryRunOutput({
            json,
            summary:
              `Would delete relation: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
            data: previewPayload,
            lines: [
              `Issue: ${issue.identifier}`,
              `Related issue: ${relatedIssue.identifier}`,
              `Relation: ${relationType}`,
            ],
          })
          return
        }

        const relationId = await withSpinner(
          () => findExistingRelation(issue.id, relatedIssue.id, relationType),
          { enabled: !json },
        )

        let payload: RelationMutationPayload
        if (relationId == null) {
          payload = buildRelationMutationPayload(
            issue,
            relatedIssue,
            relationType,
            null,
            true,
          )
        } else {
          const client = getGraphQLClient()
          let deleteData
          try {
            deleteData = await withSpinner(
              () =>
                withWriteTimeout(
                  (signal) =>
                    client.request({
                      document: DeleteIssueRelation,
                      variables: { id: relationId },
                      signal,
                    }),
                  {
                    operation: "issue relation deletion",
                    timeoutMs: writeTimeoutMs,
                    suggestion: buildWriteTimeoutSuggestion(),
                  },
                ),
              { enabled: !json },
            )
          } catch (error) {
            if (isWriteTimeoutError(error)) {
              await reconcileWriteTimeoutError(error, async () => {
                const reconciledRelationId = await findExistingRelation(
                  issue.id,
                  relatedIssue.id,
                  relationType,
                )

                if (reconciledRelationId == null) {
                  return {
                    outcome: "probably_succeeded",
                    suggestion:
                      "Linear no longer shows the relation. Treat this write as succeeded; retrying it would be a no-op.",
                    details: {
                      relationObserved: false,
                    },
                  }
                }

                return {
                  outcome: "definitely_failed",
                  suggestion:
                    "Linear still shows the relation. Re-check the issues before retrying this write.",
                  details: {
                    relationId: reconciledRelationId,
                    relationObserved: true,
                  },
                }
              })
            }
            throw error
          }

          if (!deleteData.issueRelationDelete.success) {
            throw new CliError("Failed to delete relation")
          }

          payload = buildRelationMutationPayload(
            issue,
            relatedIssue,
            relationType,
            relationId,
            false,
          )
        }

        if (json) {
          console.log(JSON.stringify(
            withOperationReceipt(
              payload,
              buildRelationReceipt(payload, "delete"),
            ),
            null,
            2,
          ))
          return
        }

        if (payload.noOp) {
          console.log(
            `✓ Relation already absent: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
          )
          return
        }

        console.log(
          `✓ Deleted relation: ${issue.identifier} ${relationType} ${relatedIssue.identifier}`,
        )
      } catch (error) {
        handleAutomationCommandError(error, "Failed to delete relation", json)
      }
    },
  )

const listRelationsCommand = new Command()
  .name("list")
  .description("List relations for an issue")
  .arguments("[issueId:string]")
  .option("-j, --json", "Output as JSON")
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list issue relations",
    )
  })
  .action(async ({ json }, issueIdArg) => {
    try {
      const issueIdentifier = await getIssueIdentifier(issueIdArg)
      if (!issueIdentifier) {
        throw new ValidationError(
          "Could not determine issue ID",
          { suggestion: "Please provide an issue ID like 'ENG-123'." },
        )
      }

      const listRelationsQuery = gql(`
        query ListIssueRelations($issueId: String!) {
          issue(id: $issueId) {
            id
            identifier
            title
            url
            relations {
              nodes {
                id
                type
                relatedIssue {
                  id
                  identifier
                  title
                  url
                  dueDate
                  state {
                    name
                    color
                  }
                }
              }
            }
            inverseRelations {
              nodes {
                id
                type
                issue {
                  id
                  identifier
                  title
                  url
                  dueDate
                  state {
                    name
                    color
                  }
                }
              }
            }
          }
        }
      `)

      const client = getGraphQLClient()
      const data = await withSpinner(async () => {
        try {
          return await client.request(listRelationsQuery, {
            issueId: issueIdentifier,
          })
        } catch (error) {
          if (isClientError(error) && isNotFoundError(error)) {
            throw new NotFoundError("Issue", issueIdentifier)
          }
          throw error
        }
      }, { enabled: !json })

      if (!data.issue) {
        throw new NotFoundError("Issue", issueIdentifier)
      }

      const { identifier, title, relations, inverseRelations } = data.issue
      const outgoing = relations.nodes
      const incoming = inverseRelations.nodes

      if (json) {
        console.log(JSON.stringify(
          {
            issue: {
              id: data.issue.id,
              identifier: data.issue.identifier,
              title: data.issue.title,
              url: data.issue.url,
            },
            outgoing: outgoing.map((rel) => ({
              id: rel.id,
              type: getDisplayRelationType(rel.type, "outgoing"),
              issue: {
                id: rel.relatedIssue.id,
                identifier: rel.relatedIssue.identifier,
                title: rel.relatedIssue.title,
                url: rel.relatedIssue.url,
                dueDate: rel.relatedIssue.dueDate,
                state: {
                  name: rel.relatedIssue.state.name,
                  color: rel.relatedIssue.state.color,
                },
              },
            })),
            incoming: incoming.map((rel) => ({
              id: rel.id,
              type: getDisplayRelationType(rel.type, "incoming"),
              issue: {
                id: rel.issue.id,
                identifier: rel.issue.identifier,
                title: rel.issue.title,
                url: rel.issue.url,
                dueDate: rel.issue.dueDate,
                state: {
                  name: rel.issue.state.name,
                  color: rel.issue.state.color,
                },
              },
            })),
          },
          null,
          2,
        ))
        return
      }

      console.log(`Relations for ${identifier}: ${title}`)
      console.log()

      if (outgoing.length === 0 && incoming.length === 0) {
        console.log("  No relations")
        return
      }

      if (outgoing.length > 0) {
        console.log("Outgoing:")
        for (const rel of outgoing) {
          console.log(
            `  ${identifier} ${rel.type} ${rel.relatedIssue.identifier}: ${rel.relatedIssue.title}`,
          )
        }
      }

      if (incoming.length > 0) {
        if (outgoing.length > 0) console.log()
        console.log("Incoming:")
        for (const rel of incoming) {
          // Show inverse perspective
          const displayType = rel.type === "blocks" ? "blocked-by" : rel.type
          console.log(
            `  ${identifier} ${displayType} ${rel.issue.identifier}: ${rel.issue.title}`,
          )
        }
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to list relations", json)
    }
  })

// Export the main command after subcommands are defined
export const relationCommand = new Command()
  .name("relation")
  .description("Manage issue relations (dependencies)")
  .action(function () {
    this.showHelp()
  })
  .command("add", addRelationCommand)
  .command("delete", deleteRelationCommand)
  .command("list", listRelationsCommand)
