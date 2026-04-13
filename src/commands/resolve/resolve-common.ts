import { handleAutomationCommandError } from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import { withSpinner } from "../../utils/spinner.ts"

export async function runResolveCommand<TPayload>(
  commandPath: string,
  options: { json?: boolean; text?: boolean },
  context: string,
  resolver: () => Promise<TPayload>,
  printPayload: (payload: TPayload) => void,
): Promise<void> {
  const json = resolveJsonOutputMode(commandPath, options)

  try {
    const payload = await withSpinner(resolver, { enabled: !json })

    if (json) {
      console.log(JSON.stringify(payload, null, 2))
      return
    }

    printPayload(payload)
  } catch (error) {
    handleAutomationCommandError(error, context, json)
  }
}
