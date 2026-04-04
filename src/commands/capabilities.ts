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
import { resolveJsonOutputMode } from "../utils/output_mode.ts"

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
    `json compatibility default: v2`,
    `automation contract latest: ${payload.contractVersions.automation.latest}`,
    `dry-run preview contract: ${payload.contractVersions.dryRunPreview.latest}`,
    `stdin policy: ${payload.contractVersions.stdinPolicy.latest}`,
    "",
    "automation tier",
    `  v1: ${payload.automationTier.byVersion.v1.join(", ")}`,
    `  v2: ${payload.automationTier.byVersion.v2.join(", ")}`,
    `  v3: ${payload.automationTier.byVersion.v3.join(", ")}`,
    "",
    "execution profiles",
    ...payload.executionProfiles.availableProfiles.map((profile) =>
      `  ${profile.name}${
        payload.executionProfiles.defaultProfile === profile.name
          ? " (default)"
          : ""
      }: pager=${profile.semantics.disablePagerByDefault ? "off" : "on"} json=${
        profile.semantics.preferJsonWhenSupported ? "preferred" : "optional"
      } timeout=${profile.semantics.defaultWriteTimeoutMs}ms confirm=${
        profile.semantics.requireExplicitConfirmationBypass
          ? "explicit --yes"
          : "interactive or --yes"
      }`
    ),
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
  const normalized = compat ?? "v2"

  if (normalized === "v1" || normalized === "v2") {
    return normalized
  }

  throw new ValidationError(
    `Unsupported capabilities compatibility version: ${normalized}`,
    {
      suggestion:
        "Use --compat v2 for the default v3 schema, or --compat v1 only for legacy startup parsers.",
    },
  )
}

export const capabilitiesCommand = new Command()
  .name("capabilities")
  .description("Describe the agent-facing command surface")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output a human-readable summary")
  .option(
    "--compat <version:string>",
    "Select the machine-readable capabilities schema version (v1, v2).",
  )
  .example(
    "Describe agent-facing capabilities as JSON",
    "linear capabilities",
  )
  .example(
    "Request the legacy v1 compatibility shape",
    "linear capabilities --compat v1",
  )
  .example(
    "Pin the richer v2 metadata shape explicitly",
    "linear capabilities --compat v2",
  )
  .example(
    "Show the human-readable summary",
    "linear capabilities --text",
  )
  .example(
    "Find commands that support dry-run",
    `linear capabilities | jq '.commands[] | select(.dryRun.supported)'`,
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to describe capabilities",
    )
  )
  .action(({ compat, json: jsonFlag, text }) => {
    const json = resolveJsonOutputMode("linear capabilities", {
      json: jsonFlag,
      text,
    })
    try {
      if (!json && compat != null) {
        throw new ValidationError(
          "--compat requires machine-readable output.",
          {
            suggestion:
              "Use `linear capabilities` or `linear capabilities --compat v2` for the default v3 schema, `linear capabilities --compat v1` only for legacy startup parsers, or `linear capabilities --text` for a human summary.",
          },
        )
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
