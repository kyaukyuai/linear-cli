import type {
  OperationReceipt,
  OperationReceiptNextSafeAction,
} from "./operation_receipt.ts"
import type { SourceIntakeAutonomyPolicyContract } from "./source_intake_policy.ts"

export type WriteOperationContractVersion = "v1"
export type WriteOperationPhase = "preview" | "apply"
export type WriteOperationNextSafeAction =
  | OperationReceiptNextSafeAction
  | "apply"

export type WriteOperationResolvedRefs = Record<string, string | null>

export type WriteOperationContract = {
  family: "write_operation"
  version: WriteOperationContractVersion
  phase: WriteOperationPhase
  command: string
  resource: string
  action: string
  summary: string
  refs: WriteOperationResolvedRefs
  changes: string[]
  noOp: boolean
  partialSuccess: boolean
  nextSafeAction: WriteOperationNextSafeAction
  autonomyPolicy?: SourceIntakeAutonomyPolicyContract
}

type GenericWritePreviewPayload = {
  command: string
  operation: "create" | "update" | "delete"
  target: Record<string, unknown>
  changes?: Record<string, unknown>
}

function normalizeResolvedRefs(
  refs: Record<string, unknown>,
): WriteOperationResolvedRefs {
  const resolvedRefs: WriteOperationResolvedRefs = {}

  for (const [key, value] of Object.entries(refs)) {
    if (value === undefined) {
      continue
    }

    resolvedRefs[key] = value == null ? null : String(value)
  }

  return resolvedRefs
}

export function buildWritePreviewOperation(options: {
  command: string
  resource: string
  action: string
  summary: string
  refs?: Record<string, unknown>
  changes?: string[]
  nextSafeAction?: WriteOperationNextSafeAction
  autonomyPolicy?: SourceIntakeAutonomyPolicyContract
}): WriteOperationContract {
  return {
    family: "write_operation",
    version: "v1",
    phase: "preview",
    command: options.command,
    resource: options.resource,
    action: options.action,
    summary: options.summary,
    refs: normalizeResolvedRefs(options.refs ?? {}),
    changes: options.changes ?? [],
    noOp: false,
    partialSuccess: false,
    nextSafeAction: options.nextSafeAction ?? "apply",
    ...(options.autonomyPolicy != null
      ? { autonomyPolicy: options.autonomyPolicy }
      : {}),
  }
}

export function buildWritePreviewOperationFromPayload(
  summary: string,
  payload: GenericWritePreviewPayload,
): WriteOperationContract {
  const { resource, ...restTarget } = payload.target

  return buildWritePreviewOperation({
    command: payload.command,
    resource: String(resource),
    action: payload.operation,
    summary,
    refs: restTarget,
    changes: Object.keys(payload.changes ?? {}),
  })
}

export function buildWriteApplyOperation(options: {
  command: string
  resource: string
  action: string
  summary: string
  refs?: Record<string, unknown>
  changes?: string[]
  noOp?: boolean
  partialSuccess?: boolean
  nextSafeAction?: OperationReceiptNextSafeAction
  autonomyPolicy?: SourceIntakeAutonomyPolicyContract
}): WriteOperationContract {
  return {
    family: "write_operation",
    version: "v1",
    phase: "apply",
    command: options.command,
    resource: options.resource,
    action: options.action,
    summary: options.summary,
    refs: normalizeResolvedRefs(options.refs ?? {}),
    changes: options.changes ?? [],
    noOp: options.noOp ?? false,
    partialSuccess: options.partialSuccess ?? false,
    nextSafeAction: options.nextSafeAction ?? "continue",
    ...(options.autonomyPolicy != null
      ? { autonomyPolicy: options.autonomyPolicy }
      : {}),
  }
}

export function buildWriteApplyOperationFromReceipt(
  summary: string,
  receipt: OperationReceipt,
): WriteOperationContract {
  return buildWriteApplyOperation({
    command: receipt.operationId,
    resource: receipt.resource,
    action: receipt.action,
    summary,
    refs: receipt.resolvedRefs,
    changes: receipt.appliedChanges,
    noOp: receipt.noOp,
    partialSuccess: receipt.partialSuccess,
    nextSafeAction: receipt.nextSafeAction,
    autonomyPolicy: receipt.autonomyPolicy,
  })
}

export function withWriteOperationContract<
  TPayload extends Record<string, unknown>,
>(
  payload: TPayload,
  operation: WriteOperationContract,
): TPayload & { operation: WriteOperationContract } {
  return {
    ...payload,
    operation,
  }
}
