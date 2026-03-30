/**
 * User-friendly error handling for the Linear CLI.
 *
 * Design philosophy (inspired by Rust's error handling ecosystem):
 * - User-facing messages should be clean and actionable
 * - Stack traces only shown when LINEAR_DEBUG=1
 * - Errors should explain what went wrong and suggest how to fix it
 * - GraphQL errors should be parsed and presented nicely
 */

import { ClientError } from "graphql-request"
import { gray, red, setColorEnabled } from "@std/fmt/colors"

const AUTH_EXIT_CODE = 4
const PLAN_LIMIT_EXIT_CODE = 5
const WRITE_TIMEOUT_EXIT_CODE = 6
const DEFAULT_PLAN_LIMIT_SUGGESTION =
  "Upgrade your Linear plan or archive existing items and retry."
const DEFAULT_RATE_LIMIT_SUGGESTION =
  "Wait for the rate limit window to reset and retry."

export type RateLimitDetails = {
  retryAfter?: string
  limit?: string
  remaining?: string
  reset?: string
}

export type WriteTimeoutDetails = {
  failureMode: "timeout_waiting_for_confirmation"
  timeoutMs: number
  operation: string
  outcome: "unknown"
}

/**
 * Check if debug mode is enabled via LINEAR_DEBUG environment variable.
 */
export function isDebugMode(): boolean {
  const debug = Deno.env.get("LINEAR_DEBUG")
  return debug === "1" || debug === "true"
}

/**
 * Base class for CLI errors with user-friendly messages.
 */
export class CliError extends Error {
  /** The clean, user-facing message */
  readonly userMessage: string
  /** Suggestion for how to fix the issue (optional) */
  readonly suggestion?: string
  /** Optional machine-readable details for JSON output */
  readonly details?: Record<string, unknown>

  constructor(
    userMessage: string,
    options?: {
      suggestion?: string
      cause?: unknown
      details?: Record<string, unknown>
    },
  ) {
    super(userMessage)
    this.name = "CliError"
    this.userMessage = userMessage
    this.suggestion = options?.suggestion
    this.details = options?.details
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

/**
 * Error for when an entity (issue, project, team, etc.) is not found.
 */
export class NotFoundError extends CliError {
  readonly entityType: string
  readonly identifier: string

  constructor(
    entityType: string,
    identifier: string,
    options?: { suggestion?: string },
  ) {
    const message = `${entityType} not found: ${identifier}`
    super(message, options)
    this.name = "NotFoundError"
    this.entityType = entityType
    this.identifier = identifier
  }
}

/**
 * Error for invalid user input (arguments, flags, etc.).
 */
export class ValidationError extends CliError {
  constructor(message: string, options?: { suggestion?: string }) {
    super(message, options)
    this.name = "ValidationError"
  }
}

/**
 * Error for authentication/authorization issues.
 */
export class AuthError extends CliError {
  constructor(message: string, options?: { suggestion?: string }) {
    super(message, {
      suggestion: options?.suggestion ??
        "Run `linear auth login` to authenticate.",
      ...options,
    })
    this.name = "AuthError"
  }
}

/**
 * Error for workspace or plan limits that block further writes.
 */
export class PlanLimitError extends CliError {
  constructor(message: string, options?: { suggestion?: string }) {
    super(message, {
      suggestion: options?.suggestion ?? DEFAULT_PLAN_LIMIT_SUGGESTION,
      ...options,
    })
    this.name = "PlanLimitError"
  }
}

/**
 * Error for client-side timeouts while waiting for Linear to confirm a write.
 */
export class WriteTimeoutError extends CliError {
  readonly operation: string
  readonly timeoutMs: number

  constructor(
    operation: string,
    timeoutMs: number,
    options?: {
      suggestion?: string
      details?: Record<string, unknown>
      cause?: unknown
    },
  ) {
    super(
      `Timed out waiting for ${operation} confirmation after ${timeoutMs}ms. The write may still have been accepted by Linear.`,
      {
        suggestion: options?.suggestion,
        cause: options?.cause,
        details: {
          failureMode: "timeout_waiting_for_confirmation",
          timeoutMs,
          operation,
          outcome: "unknown",
          ...(options?.details ?? {}),
        },
      },
    )
    this.name = "WriteTimeoutError"
    this.operation = operation
    this.timeoutMs = timeoutMs
  }
}

/**
 * Extract a user-friendly message from a GraphQL ClientError.
 *
 * Tries to find:
 * 1. userPresentableMessage from Linear's API
 * 2. First error message from the response
 * 3. Falls back to the error message
 */
export function extractGraphQLMessage(error: ClientError): string {
  const extensions = error.response?.errors?.[0]?.extensions
  const userMessage = extensions?.userPresentableMessage as string | undefined

  if (userMessage) {
    return userMessage
  }

  const firstError = error.response?.errors?.[0]
  if (firstError?.message) {
    return firstError.message
  }

  return error.message
}

/**
 * Check if a GraphQL error indicates an entity was not found.
 */
export function isNotFoundError(error: ClientError): boolean {
  const message = extractGraphQLMessage(error).toLowerCase()
  return message.includes("not found") || message.includes("entity not found")
}

/**
 * Check if an error is a GraphQL ClientError.
 */
export function isClientError(error: unknown): error is ClientError {
  return error instanceof ClientError
}

/**
 * Format and display an error to the user.
 *
 * In normal mode: Shows a clean, user-friendly message
 * In debug mode (LINEAR_DEBUG=1): Also shows the full error details
 */
export function handleError(error: unknown, context?: string): never {
  setColorEnabled(Deno.stderr.isTerminal())

  if (error instanceof CliError) {
    printCliError(error, context)
  } else if (isClientError(error)) {
    printGraphQLError(error, context)
  } else if (error instanceof Error) {
    printGenericError(error, context)
  } else {
    printUnknownError(error, context)
  }

  Deno.exit(getExitCode(error))
}

function printCliError(error: CliError, context?: string): void {
  const prefix = context ? `${context}: ` : ""
  console.error(red(`✗ ${prefix}${error.userMessage}`))

  const suggestion = getErrorSuggestion(error)
  if (suggestion != null) {
    console.error(gray(`  ${suggestion}`))
  }

  if (isDebugMode() && error.cause) {
    printDebugInfo(error.cause)
  }
}

function printGraphQLError(error: ClientError, context?: string): void {
  const message = extractGraphQLMessage(error)
  const prefix = context ? `${context}: ` : ""

  // Check for common error patterns and provide helpful messages
  if (isNotFoundError(error)) {
    console.error(red(`✗ ${prefix}${message}`))
  } else {
    console.error(red(`✗ ${prefix}${message}`))
  }

  const suggestion = getErrorSuggestion(error)
  if (suggestion != null) {
    console.error(gray(`  ${suggestion}`))
  }

  if (isDebugMode()) {
    printDebugInfo(error)
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

function printGenericError(error: Error, context?: string): void {
  const prefix = context ? `${context}: ` : ""
  console.error(red(`✗ ${prefix}${error.message}`))

  if (isDebugMode()) {
    printDebugInfo(error)
  }
}

function printUnknownError(error: unknown, context?: string): void {
  const prefix = context ? `${context}: ` : ""
  console.error(red(`✗ ${prefix}${String(error)}`))

  if (isDebugMode()) {
    console.error(gray("\nDebug info:"))
    console.error(gray(JSON.stringify(error, null, 2)))
  }
}

function printDebugInfo(error: unknown): void {
  console.error(gray("\nStack trace (LINEAR_DEBUG=1):"))
  if (error instanceof Error && error.stack) {
    console.error(gray(error.stack))
  }
}

/**
 * Wrap an async operation with error handling.
 * Similar to Rust's .context() for adding context to errors.
 *
 * @example
 * const issue = await withContext(
 *   () => getIssue(id),
 *   "Failed to fetch issue"
 * );
 */
export async function withContext<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof CliError) {
      // Re-throw with context added
      throw new CliError(`${context}: ${error.userMessage}`, {
        suggestion: error.suggestion,
        details: error.details,
        cause: error.cause ?? error,
      })
    }
    if (isClientError(error)) {
      const message = extractGraphQLMessage(error)
      throw new CliError(`${context}: ${message}`, { cause: error })
    }
    if (error instanceof Error) {
      throw new CliError(`${context}: ${error.message}`, { cause: error })
    }
    throw new CliError(`${context}: ${String(error)}`, { cause: error })
  }
}

export function getExitCode(error: unknown): number {
  if (isWriteTimeoutError(error)) {
    return WRITE_TIMEOUT_EXIT_CODE
  }

  if (isPlanLimitError(error)) {
    return PLAN_LIMIT_EXIT_CODE
  }

  if (isAuthFailure(error)) {
    return AUTH_EXIT_CODE
  }

  return 1
}

export function getErrorSuggestion(error: unknown): string | undefined {
  if (error instanceof CliError && error.suggestion != null) {
    return error.suggestion
  }

  if (isPlanLimitError(error)) {
    return DEFAULT_PLAN_LIMIT_SUGGESTION
  }

  if (isRateLimitError(error)) {
    return buildRateLimitSuggestion(getRateLimitDetails(error))
  }

  if (isAuthFailure(error)) {
    return "Run `linear auth login` to authenticate."
  }

  return undefined
}

function isAuthFailure(error: unknown): boolean {
  for (const candidate of iterateErrorChain(error)) {
    if (candidate instanceof AuthError) {
      return true
    }

    if (isClientError(candidate) && isGraphQLAuthError(candidate)) {
      return true
    }
  }

  return false
}

export function isWriteTimeoutError(error: unknown): boolean {
  for (const candidate of iterateErrorChain(error)) {
    if (candidate instanceof WriteTimeoutError) {
      return true
    }
  }

  return false
}

export function isPlanLimitError(error: unknown): boolean {
  for (const candidate of iterateErrorChain(error)) {
    if (candidate instanceof PlanLimitError) {
      return true
    }

    if (
      candidate instanceof CliError && isPlanLimitMessage(candidate.userMessage)
    ) {
      return true
    }

    if (isClientError(candidate) && isGraphQLPlanLimitError(candidate)) {
      return true
    }
  }

  return false
}

export function getRateLimitDetails(
  error: unknown,
): RateLimitDetails | undefined {
  for (const candidate of iterateErrorChain(error)) {
    if (candidate instanceof CliError) {
      const rateLimitDetails = extractRateLimitDetails(candidate.details)
      if (rateLimitDetails != null) {
        return rateLimitDetails
      }
    }

    if (isClientError(candidate)) {
      const details = getGraphQLRateLimitDetails(candidate)
      if (details != null) {
        return details
      }
    }
  }

  return undefined
}

export function getWriteTimeoutDetails(
  error: unknown,
): WriteTimeoutDetails | undefined {
  for (const candidate of iterateErrorChain(error)) {
    if (candidate instanceof WriteTimeoutError) {
      return extractWriteTimeoutDetails(candidate.details)
    }

    if (candidate instanceof CliError) {
      const details = extractWriteTimeoutDetails(candidate.details)
      if (details != null) {
        return details
      }
    }
  }

  return undefined
}

function* iterateErrorChain(error: unknown): Generator<unknown> {
  let current: unknown = error
  const seen = new Set<unknown>()

  while (current != null && !seen.has(current)) {
    yield current
    seen.add(current)

    if (current instanceof Error && current.cause != null) {
      current = current.cause
      continue
    }

    break
  }
}

function isGraphQLPlanLimitError(error: ClientError): boolean {
  return isPlanLimitMessage(extractGraphQLMessage(error))
}

function isRateLimitError(error: unknown): boolean {
  return getRateLimitDetails(error) != null
}

function isPlanLimitMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("retry-after") ||
    lowerMessage.includes("too many requests")
  ) {
    return false
  }

  return lowerMessage.includes("free plan") ||
    lowerMessage.includes("plan limit") ||
    lowerMessage.includes("issue limit") ||
    lowerMessage.includes("project limit") ||
    (lowerMessage.includes("upgrade") && lowerMessage.includes("archive")) ||
    (lowerMessage.includes("upgrade") && lowerMessage.includes("limit"))
}

function isRateLimitMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many requests") ||
    lowerMessage.includes("retry-after")
}

function getGraphQLRateLimitDetails(
  error: ClientError,
): RateLimitDetails | undefined {
  const status = error.response?.status
  const message = extractGraphQLMessage(error)
  const headers = error.response?.headers

  if (status !== 429 && !isRateLimitMessage(message)) {
    return undefined
  }

  if (!(headers instanceof Headers)) {
    return {}
  }

  const details: RateLimitDetails = {}

  const retryAfter = headers.get("Retry-After") ??
    headers.get("retry-after") ?? undefined
  const limit = headers.get("X-RateLimit-Limit") ??
    headers.get("x-ratelimit-limit") ?? undefined
  const remaining = headers.get("X-RateLimit-Remaining") ??
    headers.get("x-ratelimit-remaining") ?? undefined
  const reset = headers.get("X-RateLimit-Reset") ??
    headers.get("x-ratelimit-reset") ?? undefined

  if (retryAfter != null) {
    details.retryAfter = retryAfter
  }

  if (limit != null) {
    details.limit = limit
  }

  if (remaining != null) {
    details.remaining = remaining
  }

  if (reset != null) {
    details.reset = reset
  }

  return Object.keys(details).length > 0 ? details : {}
}

function extractRateLimitDetails(
  details: Record<string, unknown> | undefined,
): RateLimitDetails | undefined {
  const rateLimit = details?.rateLimit
  if (rateLimit == null || typeof rateLimit !== "object") {
    return undefined
  }

  const candidate = rateLimit as Record<string, unknown>
  const extracted: RateLimitDetails = {}

  for (const key of ["retryAfter", "limit", "remaining", "reset"] as const) {
    const value = candidate[key]
    if (typeof value === "string" && value.length > 0) {
      extracted[key] = value
    }
  }

  return Object.keys(extracted).length > 0 ? extracted : undefined
}

function extractWriteTimeoutDetails(
  details: Record<string, unknown> | undefined,
): WriteTimeoutDetails | undefined {
  if (details == null) {
    return undefined
  }

  const failureMode = details.failureMode
  const timeoutMs = details.timeoutMs
  const operation = details.operation
  const outcome = details.outcome

  if (
    failureMode !== "timeout_waiting_for_confirmation" ||
    typeof timeoutMs !== "number" ||
    typeof operation !== "string" ||
    outcome !== "unknown"
  ) {
    return undefined
  }

  return {
    failureMode,
    timeoutMs,
    operation,
    outcome,
  }
}

function buildRateLimitSuggestion(
  details: RateLimitDetails | undefined,
): string {
  const retryAfter = details?.retryAfter
  if (retryAfter == null) {
    return DEFAULT_RATE_LIMIT_SUGGESTION
  }

  const retryAfterSeconds = parseRetryAfterSeconds(retryAfter)
  if (retryAfterSeconds != null) {
    const unit = retryAfterSeconds === 1 ? "second" : "seconds"
    return `Retry after ${retryAfterSeconds} ${unit} before creating more issues.`
  }

  return `Retry after ${retryAfter} before creating more issues.`
}

function parseRetryAfterSeconds(value: string): number | undefined {
  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  return undefined
}

function isGraphQLAuthError(error: ClientError): boolean {
  const status = error.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  const message = extractGraphQLMessage(error).toLowerCase()
  return message.includes("auth") || message.includes("unauthorized") ||
    message.includes("forbidden") || message.includes("api key")
}

/**
 * Create a standardized "not found" error handler for GraphQL queries.
 *
 * @example
 * const issue = await client.request(query, { id })
 *   .catch(handleNotFound("Issue", issueIdentifier));
 */
export function handleNotFound(
  entityType: string,
  identifier: string,
): (error: unknown) => never {
  return (error: unknown) => {
    if (isClientError(error) && isNotFoundError(error)) {
      throw new NotFoundError(entityType, identifier)
    }
    throw error
  }
}
