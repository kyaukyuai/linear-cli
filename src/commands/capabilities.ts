import { Command } from "@cliffy/command"
import denoConfig from "../../deno.json" with { type: "json" }
import { buildCapabilitiesPayload } from "../utils/capabilities.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../utils/json_output.ts"

function formatCapabilitySupport(
  supported: boolean,
  contractVersion: string | null,
): string {
  if (!supported) {
    return "no"
  }

  return contractVersion ?? "yes"
}

function renderCapabilitiesSummary(
  payload: ReturnType<typeof buildCapabilitiesPayload>,
): string {
  const lines = [
    `linear-cli ${payload.cli.version}`,
    `capabilities schema: ${payload.schemaVersion}`,
    `automation contract latest: ${payload.contractVersions.automation.latest}`,
    `dry-run preview contract: ${payload.contractVersions.dryRunPreview.latest}`,
    `stdin policy: ${payload.contractVersions.stdinPolicy.latest}`,
    "",
    "automation tier",
    `  v1: ${payload.automationTier.byVersion.v1.join(", ")}`,
    `  v2: ${payload.automationTier.byVersion.v2.join(", ")}`,
    `  v3: ${payload.automationTier.byVersion.v3.join(", ")}`,
    "",
    "agent-facing commands",
  ]

  for (const command of payload.commands) {
    lines.push(
      `  ${command.path} :: json=${
        formatCapabilitySupport(
          command.json.supported,
          command.json.contractVersion,
        )
      } dry-run=${
        formatCapabilitySupport(
          command.dryRun.supported,
          command.dryRun.contractVersion,
        )
      } stdin=${command.stdin.mode} confirm=${
        command.confirmationBypass ?? "none"
      } idempotency=${command.idempotency.category}`,
    )

    if (command.idempotency.notes != null) {
      lines.push(`    retry: ${command.idempotency.notes}`)
    }

    if (command.notes != null) {
      lines.push(`    note: ${command.notes}`)
    }
  }

  return lines.join("\n")
}

export const capabilitiesCommand = new Command()
  .name("capabilities")
  .description("Describe the agent-facing command surface")
  .option("-j, --json", "Output the capabilities registry as JSON")
  .example(
    "Describe agent-facing capabilities as JSON",
    "linear capabilities --json",
  )
  .example(
    "Find commands that support dry-run",
    `linear capabilities --json | jq '.commands[] | select(.dryRun.supported)'`,
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to describe capabilities",
    )
  )
  .action(({ json }) => {
    try {
      const payload = buildCapabilitiesPayload(denoConfig.version)

      if (json) {
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      console.log(renderCapabilitiesSummary(payload))
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to describe capabilities",
        json,
      )
    }
  })
