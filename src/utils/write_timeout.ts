import { ValidationError, WriteTimeoutError } from "./errors.ts"

export const DEFAULT_WRITE_TIMEOUT_MS = 30_000
export const WRITE_TIMEOUT_ENV_VAR = "LINEAR_WRITE_TIMEOUT_MS"

export function resolveWriteTimeoutMs(timeoutMs?: number): number {
  if (timeoutMs != null) {
    return validateWriteTimeoutMs(timeoutMs, "--timeout-ms")
  }

  const envValue = Deno.env.get(WRITE_TIMEOUT_ENV_VAR)
  if (envValue == null || envValue.trim().length === 0) {
    return DEFAULT_WRITE_TIMEOUT_MS
  }

  return validateWriteTimeoutMs(Number(envValue), WRITE_TIMEOUT_ENV_VAR)
}

export async function withWriteTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: {
    operation: string
    timeoutMs: number
    suggestion?: string
    details?: Record<string, unknown>
  },
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      const abortError = new DOMException(
        `Timed out waiting for ${options.operation} confirmation.`,
        "AbortError",
      )
      controller.abort(abortError)
      reject(
        new WriteTimeoutError(options.operation, options.timeoutMs, {
          suggestion: options.suggestion,
          details: options.details,
          cause: abortError,
        }),
      )
    }, options.timeoutMs)
  })

  try {
    return await Promise.race([
      work(controller.signal),
      timeoutPromise,
    ])
  } catch (error) {
    if (error instanceof WriteTimeoutError) {
      throw error
    }

    if (timedOut || isAbortError(error)) {
      throw new WriteTimeoutError(options.operation, options.timeoutMs, {
        suggestion: options.suggestion,
        details: options.details,
        cause: error,
      })
    }
    throw error
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

export function buildWriteTimeoutSuggestion(): string {
  return "Check Linear before retrying. Increase the timeout with --timeout-ms or LINEAR_WRITE_TIMEOUT_MS if this write path is consistently slow."
}

function validateWriteTimeoutMs(value: number, source: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      `${source} must be a positive integer number of milliseconds`,
      {
        suggestion: source === WRITE_TIMEOUT_ENV_VAR
          ? `Unset ${WRITE_TIMEOUT_ENV_VAR} or set it to a positive integer like 45000.`
          : "Use a positive integer like --timeout-ms 45000.",
      },
    )
  }

  return value
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError"
  }

  return error instanceof Error && error.name === "AbortError"
}
