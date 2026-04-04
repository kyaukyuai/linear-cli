import { ValidationError } from "./errors.ts"

const DEFAULT_JSON_COMMAND_PATHS = new Set<string>([
  "linear capabilities",
  "linear resolve issue",
  "linear resolve team",
  "linear resolve workflow-state",
  "linear resolve user",
  "linear resolve label",
  "linear issue list",
  "linear issue view",
  "linear issue create",
  "linear issue update",
  "linear project view",
  "linear cycle current",
  "linear document list",
  "linear webhook view",
  "linear notification list",
])

type OutputModeOptions = {
  json?: boolean
  text?: boolean
}

export function defaultsToJsonOutput(commandPath: string): boolean {
  return DEFAULT_JSON_COMMAND_PATHS.has(commandPath)
}

export function resolveJsonOutputMode(
  commandPath: string,
  { json, text }: OutputModeOptions,
): boolean {
  if (json && text) {
    throw new ValidationError("Cannot use --json with --text", {
      suggestion: defaultsToJsonOutput(commandPath)
        ? "This command defaults to machine-readable output in v3. Omit both flags for JSON, or pass --text for human-readable output."
        : "Use either --json for machine-readable output or --text for human-readable output.",
    })
  }

  if (text) {
    return false
  }

  if (json) {
    return true
  }

  return defaultsToJsonOutput(commandPath)
}

export function rawArgsRequestJson(
  commandPath: string,
  args?: string[],
): boolean {
  if (args == null) {
    return defaultsToJsonOutput(commandPath)
  }

  if (args.includes("--text")) {
    return false
  }

  if (args.includes("--json") || args.includes("-j")) {
    return true
  }

  return defaultsToJsonOutput(commandPath)
}
