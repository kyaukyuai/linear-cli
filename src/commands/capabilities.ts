import { Command } from "@cliffy/command"
import denoConfig from "../../deno.json" with { type: "json" }
import {
  buildCapabilitiesPayload,
  type CapabilitiesCompatibilityVersion,
  type CapabilitiesPayloadV2,
} from "../utils/capabilities.ts"
import { ValidationError } from "../utils/errors.ts"
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
  payload: CapabilitiesPayloadV2,
): string {
  const lines = [
    `linear-cli ${payload.cli.version}`,
    `capabilities schema latest: v2`,
    `json compatibility default: v1`,
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
      } inputs=${
        command.schema.inputModes.join(",")
      } success=${command.output.success.category} confirm=${
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

function parseCompatibilityVersion(
  compat: string | undefined,
): CapabilitiesCompatibilityVersion {
  const normalized = compat ?? "v1"

  if (normalized === "v1" || normalized === "v2") {
    return normalized
  }

  throw new ValidationError(
    `Unsupported capabilities compatibility version: ${normalized}`,
    {
      suggestion: "Use --compat v1 or --compat v2.",
    },
  )
}

export const capabilitiesCommand = new Command()
  .name("capabilities")
  .description("Describe the agent-facing command surface")
  .option("-j, --json", "Output the capabilities registry as JSON")
  .option(
    "--compat <version:string>",
    "Select the machine-readable capabilities schema version (v1, v2). Requires --json.",
  )
  .example(
    "Describe agent-facing capabilities as JSON",
    "linear capabilities --json",
  )
  .example(
    "Request the richer v2 metadata shape",
    "linear capabilities --json --compat v2",
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
  .action(({ compat, json }) => {
    try {
      if (!json && compat != null) {
        throw new ValidationError("--compat requires --json.", {
          suggestion:
            "Use `linear capabilities --json --compat v2` or omit --compat for the human summary.",
        })
      }

      if (json) {
        const payload = buildCapabilitiesPayload(
          denoConfig.version,
          parseCompatibilityVersion(compat),
        )
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      const payload = buildCapabilitiesPayload(denoConfig.version, "v2")
      console.log(renderCapabilitiesSummary(payload))
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to describe capabilities",
        json,
      )
    }
  })
