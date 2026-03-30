import { gray } from "@std/fmt/colors"
import {
  AuthError,
  CliError,
  extractGraphQLMessage,
  getErrorSuggestion,
  getExitCode,
  getRateLimitDetails,
  getWriteTimeoutDetails,
  handleError,
  isClientError,
  isDebugMode,
  isNotFoundError,
  isWriteTimeoutError,
  NotFoundError,
  PlanLimitError,
  ValidationError,
  WriteTimeoutError,
} from "./errors.ts"

export type JsonErrorType =
  | "validation_error"
  | "not_found"
  | "auth_error"
  | "timeout_error"
  | "cli_error"
  | "graphql_error"
  | "unknown_error"

export type JsonErrorEnvelope = {
  success: false
  error: {
    type: JsonErrorType
    message: string
    suggestion: string | null
    context: string | null
    details?: Record<string, unknown>
  }
}

export function buildJsonErrorEnvelope(
  error: unknown,
  context?: string,
): JsonErrorEnvelope {
  return {
    success: false,
    error: {
      type: getJsonErrorType(error),
      message: getJsonErrorMessage(error),
      suggestion: getJsonErrorSuggestion(error),
      context: context ?? null,
      ...getJsonErrorDetails(error),
    },
  }
}

export function handleJsonError(error: unknown, context?: string): never {
  console.log(JSON.stringify(buildJsonErrorEnvelope(error, context), null, 2))

  if (isDebugMode()) {
    printJsonDebugInfo(error)
  }

  Deno.exit(getExitCode(error))
}

export function handleAutomationCommandError(
  error: unknown,
  context: string,
  json: boolean | undefined,
): never {
  if (json) {
    handleJsonError(error, context)
  }

  handleError(error, context)
}

type AutomationContractCommand = {
  getPath(): string
}

const AUTOMATION_CONTRACT_CONTEXT_BY_PATH = new Map<string, string>([
  ["linear capabilities", "Failed to describe capabilities"],
  ["linear issue list", "Failed to list issues"],
  ["linear issue view", "Failed to view issue"],
  ["linear issue create", "Failed to create issue"],
  ["linear issue update", "Failed to update issue"],
  ["linear issue relation add", "Failed to add issue relation"],
  ["linear issue relation delete", "Failed to delete issue relation"],
  ["linear issue relation list", "Failed to list issue relations"],
  ["linear issue comment add", "Failed to add comment"],
  ["linear team members", "Failed to fetch team members"],
  ["linear issue parent", "Failed to fetch parent issue"],
  ["linear issue children", "Failed to fetch child issues"],
  ["linear issue create-batch", "Failed to create issue batch"],
  ["linear initiative list", "Failed to list initiatives"],
  ["linear initiative view", "Failed to view initiative"],
  ["linear initiative-update list", "Failed to list initiative updates"],
  ["linear project list", "Failed to list projects"],
  ["linear project view", "Failed to view project"],
  ["linear project-update list", "Failed to fetch project updates"],
  ["linear cycle list", "Failed to list cycles"],
  ["linear cycle view", "Failed to view cycle"],
  ["linear cycle current", "Failed to get current cycle"],
  ["linear cycle next", "Failed to get next cycle"],
  ["linear milestone list", "Failed to list milestones"],
  ["linear milestone view", "Failed to view milestone"],
  ["linear document list", "Failed to list documents"],
  ["linear document view", "Failed to view document"],
  ["linear webhook list", "Failed to list webhooks"],
  ["linear webhook view", "Failed to view webhook"],
  ["linear notification list", "Failed to list notifications"],
  ["linear notification count", "Failed to count notifications"],
  ["linear team list", "Failed to fetch teams"],
  ["linear team view", "Failed to view team"],
  ["linear user list", "Failed to list users"],
  ["linear user view", "Failed to view user"],
  ["linear workflow-state list", "Failed to list workflow states"],
  ["linear workflow-state view", "Failed to view workflow state"],
  ["linear label list", "Failed to fetch labels"],
  ["linear project-label list", "Failed to list project labels"],
])

export function maybeHandleAutomationContractParseError(
  error: unknown,
  cmd: AutomationContractCommand,
): void {
  const context = AUTOMATION_CONTRACT_CONTEXT_BY_PATH.get(cmd.getPath())
  if (context == null || !hasJsonFlag(getRawArgs(cmd))) {
    return
  }

  handleJsonError(error, context)
}

export function handleAutomationContractParseError(
  error: unknown,
  cmd: AutomationContractCommand,
  context: string,
): void {
  if (!hasJsonFlag(getRawArgs(cmd))) {
    return
  }

  handleJsonError(error, context)
}

function getJsonErrorType(error: unknown): JsonErrorType {
  if (error instanceof WriteTimeoutError || isWriteTimeoutError(error)) {
    return "timeout_error"
  }
  if (error instanceof ValidationError) {
    return "validation_error"
  }
  if (isCliffyValidationError(error)) {
    return "validation_error"
  }
  if (error instanceof NotFoundError) {
    return "not_found"
  }
  if (error instanceof AuthError) {
    return "auth_error"
  }
  if (error instanceof PlanLimitError) {
    return "cli_error"
  }
  if (error instanceof CliError) {
    return "cli_error"
  }
  if (isClientError(error)) {
    if (isNotFoundError(error)) {
      return "not_found"
    }
    if (isGraphQLAuthError(error)) {
      return "auth_error"
    }
    return "graphql_error"
  }
  return "unknown_error"
}

function getJsonErrorMessage(error: unknown): string {
  if (error instanceof CliError) {
    return error.userMessage
  }
  if (isCliffyValidationError(error)) {
    return error.message
  }
  if (isClientError(error)) {
    return extractGraphQLMessage(error)
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function getJsonErrorSuggestion(error: unknown): string | null {
  return getErrorSuggestion(error) ?? null
}

function getJsonErrorDetails(
  error: unknown,
): { details?: Record<string, unknown> } {
  const rateLimitDetails = getRateLimitDetails(error)
  const writeTimeoutDetails = getWriteTimeoutDetails(error)

  if (error instanceof CliError && error.details != null) {
    return {
      details: {
        ...error.details,
        ...(rateLimitDetails == null ? {} : { rateLimit: rateLimitDetails }),
        ...(writeTimeoutDetails == null ? {} : writeTimeoutDetails),
      },
    }
  }

  if (writeTimeoutDetails != null && rateLimitDetails != null) {
    return { details: { ...writeTimeoutDetails, rateLimit: rateLimitDetails } }
  }

  if (writeTimeoutDetails != null) {
    return { details: writeTimeoutDetails }
  }

  if (rateLimitDetails != null) {
    return { details: { rateLimit: rateLimitDetails } }
  }

  return {}
}

function isGraphQLAuthError(
  error: Parameters<typeof extractGraphQLMessage>[0],
): boolean {
  const status = error.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  const message = extractGraphQLMessage(error).toLowerCase()
  return message.includes("auth") || message.includes("unauthorized") ||
    message.includes("forbidden") || message.includes("api key")
}

function printJsonDebugInfo(error: unknown): void {
  console.error(gray("Stack trace (LINEAR_DEBUG=1):"))

  if (error instanceof Error && error.stack) {
    console.error(gray(error.stack))
  } else {
    console.error(gray(String(error)))
  }

  if (isClientError(error)) {
    const query = error.request?.query
    const vars = error.request?.variables

    if (query) {
      console.error(gray("\nQuery:"))
      console.error(gray(String(query).trim()))
    }

    if (vars) {
      console.error(gray("\nVariables:"))
      console.error(gray(JSON.stringify(vars, null, 2)))
    }
  }
}

function hasJsonFlag(args?: string[]): boolean {
  return args?.some((arg) => arg === "--json" || arg === "-j") ?? false
}

function getRawArgs(cmd: AutomationContractCommand): string[] | undefined {
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
