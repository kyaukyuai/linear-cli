import {
  CliError,
  getWriteTimeoutDetails,
  isWriteTimeoutError,
  WriteTimeoutError,
} from "./errors.ts"

export type WriteReconciliationOutcome =
  | "definitely_failed"
  | "probably_succeeded"
  | "partial_success"

export type WriteReconciliationResult = {
  outcome: WriteReconciliationOutcome
  details?: Record<string, unknown>
  suggestion?: string
}

export function buildReconciledTimeoutError(
  error: unknown,
  result: WriteReconciliationResult,
): CliError | WriteTimeoutError {
  const timeoutDetails = getWriteTimeoutDetails(error)
  if (timeoutDetails == null) {
    throw error instanceof Error ? error : new Error(String(error))
  }

  const existingDetails = error instanceof CliError && error.details != null
    ? error.details
    : {}
  const mergedDetails = {
    ...existingDetails,
    ...timeoutDetails,
    reconciliationAttempted: true,
    outcome: result.outcome,
    ...(result.details ?? {}),
  }
  const suggestion = result.suggestion ??
    (error instanceof CliError ? error.suggestion : undefined)
  const timeoutError = new WriteTimeoutError(
    timeoutDetails.operation,
    timeoutDetails.timeoutMs,
    {
      suggestion,
      details: mergedDetails,
      cause: error instanceof Error ? error.cause ?? error : error,
    },
  )

  if (error instanceof CliError && !(error instanceof WriteTimeoutError)) {
    return new CliError(error.userMessage, {
      suggestion,
      cause: timeoutError,
      details: mergedDetails,
    })
  }

  return timeoutError
}

export async function reconcileWriteTimeoutError(
  error: unknown,
  reconcile: () => Promise<WriteReconciliationResult | null>,
): Promise<never> {
  if (!isWriteTimeoutError(error)) {
    throw error instanceof Error ? error : new Error(String(error))
  }

  let result: WriteReconciliationResult | null = null
  try {
    result = await reconcile()
  } catch {
    throw error instanceof Error ? error : new Error(String(error))
  }

  if (result == null) {
    throw error instanceof Error ? error : new Error(String(error))
  }

  throw buildReconciledTimeoutError(error, result)
}
