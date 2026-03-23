export type WritePreviewOperation = "create" | "update" | "delete"

type CompactRecord<T extends Record<string, unknown>> = {
  [K in keyof T as T[K] extends undefined ? never : K]: Exclude<T[K], undefined>
}

export function compactPreviewRecord<T extends Record<string, unknown>>(
  value: T,
): CompactRecord<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as CompactRecord<T>
}

export function buildWriteCommandPreview<
  TTarget extends Record<string, unknown>,
  TChanges extends Record<string, unknown> | undefined = undefined,
>(options: {
  command: string
  operation: WritePreviewOperation
  target: TTarget
  changes?: TChanges
  destructive?: boolean
}) {
  return compactPreviewRecord({
    command: options.command,
    operation: options.operation,
    destructive: options.destructive ?? options.operation === "delete",
    target: options.target,
    changes: options.changes,
  })
}
