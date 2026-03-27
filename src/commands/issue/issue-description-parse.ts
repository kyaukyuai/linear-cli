import { gray, red, setColorEnabled } from "@std/fmt/colors"
import { ValidationError } from "../../utils/errors.ts"
import { handleJsonError } from "../../utils/json_output.ts"

type ParseAwareCommand = {
  getPath(): string
}

const DESCRIPTION_FILE_SUGGESTION =
  "If you're passing long Markdown, prefer --description-file <path> or pipe content on stdin."

export function maybeHandleIssueDescriptionParseError(
  error: unknown,
  cmd: ParseAwareCommand,
  context: string,
): boolean {
  const rawArgs = getRawArgs(cmd)
  if (!shouldHandleDescriptionParseError(error, rawArgs)) {
    return false
  }

  const enhancedError = new ValidationError(getErrorMessage(error), {
    suggestion: DESCRIPTION_FILE_SUGGESTION,
  })

  if (hasJsonFlag(rawArgs)) {
    handleJsonError(enhancedError, context)
  }

  setColorEnabled(Deno.stderr.isTerminal())
  const prefix = context ? `${context}: ` : ""
  console.error(red(`✗ ${prefix}${enhancedError.userMessage}`))
  console.error(gray(`  ${DESCRIPTION_FILE_SUGGESTION}`))
  Deno.exit(2)
}

function shouldHandleDescriptionParseError(
  error: unknown,
  rawArgs?: string[],
): boolean {
  if (!isCliffyValidationError(error)) {
    return false
  }

  return rawArgs?.some((arg) => arg === "-d" || arg === "--description") ??
    false
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function hasJsonFlag(args?: string[]): boolean {
  return args?.some((arg) => arg === "--json" || arg === "-j") ?? false
}

function getRawArgs(cmd: ParseAwareCommand): string[] | undefined {
  const rawArgs = Reflect.get(cmd as object, "rawArgs")
  if (
    !Array.isArray(rawArgs) || rawArgs.some((arg) => typeof arg !== "string")
  ) {
    return undefined
  }
  return rawArgs
}

function isCliffyValidationError(error: unknown): error is Error {
  return error instanceof Error &&
    (error.name === "ValidationError" ||
      error.constructor.name === "ValidationError")
}
