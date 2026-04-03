import { handleAutomationCommandError } from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import {
  type AnyReferenceResolutionPayload,
  printReferenceResolution,
} from "../../utils/reference_resolution.ts"
import { withSpinner } from "../../utils/spinner.ts"

export async function runResolveCommand(
  commandPath: string,
  options: { json?: boolean; text?: boolean },
  context: string,
  resolver: () => Promise<AnyReferenceResolutionPayload>,
): Promise<void> {
  const json = resolveJsonOutputMode(commandPath, options)

  try {
    const payload = await withSpinner(resolver, { enabled: !json })

    if (json) {
      console.log(JSON.stringify(payload, null, 2))
      return
    }

    printReferenceResolution(payload)
  } catch (error) {
    handleAutomationCommandError(error, context, json)
  }
}
