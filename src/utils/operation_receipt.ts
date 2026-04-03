export type OperationReceiptNextSafeAction =
  | "continue"
  | "read_before_retry"

export type OperationReceiptResolvedRefs = Record<string, string | null>

export type OperationReceipt = {
  operationId: string
  resource: string
  action: string
  resolvedRefs: OperationReceiptResolvedRefs
  appliedChanges: string[]
  noOp: boolean
  partialSuccess: boolean
  nextSafeAction: OperationReceiptNextSafeAction
}

export function buildOperationReceipt(
  options: {
    operationId: string
    resource: string
    action: string
    resolvedRefs?: Record<string, string | null | undefined>
    appliedChanges?: string[]
    noOp?: boolean
    partialSuccess?: boolean
    nextSafeAction?: OperationReceiptNextSafeAction
  },
): OperationReceipt {
  const resolvedRefs: OperationReceiptResolvedRefs = {}

  for (const [key, value] of Object.entries(options.resolvedRefs ?? {})) {
    if (value !== undefined) {
      resolvedRefs[key] = value
    }
  }

  return {
    operationId: options.operationId,
    resource: options.resource,
    action: options.action,
    resolvedRefs,
    appliedChanges: options.appliedChanges ?? [],
    noOp: options.noOp ?? false,
    partialSuccess: options.partialSuccess ?? false,
    nextSafeAction: options.nextSafeAction ?? "continue",
  }
}

export function withOperationReceipt<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  receipt: OperationReceipt,
): TPayload & { receipt: OperationReceipt } {
  return {
    ...payload,
    receipt,
  }
}
