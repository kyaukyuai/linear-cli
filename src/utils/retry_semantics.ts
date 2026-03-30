export type PartialSuccessDetails<
  TPartialSuccess extends Record<string, unknown>,
> = {
  failureStage: string
  retryable: boolean
  retryCommand?: string
  partialSuccess: TPartialSuccess
}

export function buildPartialSuccessDetails<
  TPartialSuccess extends Record<string, unknown>,
>(
  partialSuccess: TPartialSuccess,
  options: {
    failureStage: string
    retryable: boolean
    retryCommand?: string
    extraDetails?: Record<string, unknown>
  },
): Record<string, unknown> {
  const details: Record<string, unknown> = {
    failureStage: options.failureStage,
    retryable: options.retryable,
    partialSuccess,
  }

  if (options.retryCommand != null) {
    details.retryCommand = options.retryCommand
  }

  if (options.extraDetails != null) {
    Object.assign(details, options.extraDetails)
  }

  return details
}
