import { handleAutomationCommandError } from "../../utils/json_output.ts"
import {
  type AnyReferenceResolutionPayload,
  printReferenceResolution,
} from "../../utils/reference_resolution.ts"
import { withSpinner } from "../../utils/spinner.ts"

export async function runResolveCommand(
  json: boolean | undefined,
  context: string,
  resolver: () => Promise<AnyReferenceResolutionPayload>,
): Promise<void> {
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
