export type DryRunJsonEnvelope<T> = {
  success: true
  dryRun: true
  summary: string
  data: T
}

export type DryRunExecutionResult<TPreview, TResult> =
  | {
    dryRun: true
    value: TPreview
  }
  | {
    dryRun: false
    value: TResult
  }

type EmitDryRunOutputOptions<T> = {
  json?: boolean
  summary: string
  data: T
  lines?: string[]
}

type RunWithDryRunOptions<TPreview, TResult> = {
  dryRun?: boolean
  buildPreview: () => TPreview | Promise<TPreview>
  execute: () => TResult | Promise<TResult>
}

export function buildDryRunJsonEnvelope<T>(
  data: T,
  summary: string,
): DryRunJsonEnvelope<T> {
  return {
    success: true,
    dryRun: true,
    summary,
    data,
  }
}

export function emitDryRunOutput<T>(
  options: EmitDryRunOutputOptions<T>,
): void {
  if (options.json) {
    console.log(
      JSON.stringify(
        buildDryRunJsonEnvelope(options.data, options.summary),
        null,
        2,
      ),
    )
    return
  }

  console.log(`Dry run: ${options.summary}`)
  for (const line of options.lines ?? []) {
    console.log(line)
  }
}

export async function runWithDryRun<TPreview, TResult>(
  options: RunWithDryRunOptions<TPreview, TResult>,
): Promise<DryRunExecutionResult<TPreview, TResult>> {
  if (options.dryRun) {
    return {
      dryRun: true,
      value: await options.buildPreview(),
    }
  }

  return {
    dryRun: false,
    value: await options.execute(),
  }
}
