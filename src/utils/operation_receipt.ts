export type OperationReceiptNextSafeAction =
  | "continue"
  | "read_before_retry"

export type OperationReceiptResolvedRefs = Record<string, string | null>

export type OperationReceiptSourceProvenance = {
  version: "v1"
  target: "description" | "comment"
  source: {
    system: string
    ref: string | null
    url: string | null
    title: string | null
    capturedAt: string | null
  }
  contextIds: Record<string, string>
  evidenceRefs: string[]
  relatedUrls: string[]
  participantHandles: string[]
  metadataKeys: string[]
  triage: {
    applied: boolean
    team: string | null
    state: string | null
    labels: string[]
    duplicateIssueRefs: string[]
    relatedIssueRefs: string[]
  } | null
}

export type OperationReceipt = {
  operationId: string
  resource: string
  action: string
  resolvedRefs: OperationReceiptResolvedRefs
  appliedChanges: string[]
  noOp: boolean
  partialSuccess: boolean
  nextSafeAction: OperationReceiptNextSafeAction
  sourceProvenance?: OperationReceiptSourceProvenance
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
    sourceProvenance?: OperationReceiptSourceProvenance
  },
): OperationReceipt {
  const resolvedRefs: OperationReceiptResolvedRefs = {}

  for (const [key, value] of Object.entries(options.resolvedRefs ?? {})) {
    if (value !== undefined) {
      resolvedRefs[key] = value
    }
  }

  const receipt: OperationReceipt = {
    operationId: options.operationId,
    resource: options.resource,
    action: options.action,
    resolvedRefs,
    appliedChanges: options.appliedChanges ?? [],
    noOp: options.noOp ?? false,
    partialSuccess: options.partialSuccess ?? false,
    nextSafeAction: options.nextSafeAction ?? "continue",
  }

  if (options.sourceProvenance != null) {
    receipt.sourceProvenance = options.sourceProvenance
  }

  return receipt
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
