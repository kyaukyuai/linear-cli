import { shouldAllowInteractivePrompts } from "./execution_profile.ts"
import { ValidationError } from "./errors.ts"

export const USE_YES_SUGGESTION =
  "Use --yes to skip confirmation, or pass --interactive to confirm in a terminal."

export type ConfirmationBypassOptions = {
  yes?: boolean
  force?: boolean
  confirm?: boolean
  interactive?: boolean
}

export function shouldSkipConfirmation(
  options: ConfirmationBypassOptions,
): boolean {
  return options.yes === true || options.force === true ||
    options.confirm === true
}

export function ensureInteractiveConfirmationAvailable(
  options: ConfirmationBypassOptions,
  message = "Interactive confirmation required",
): void {
  if (shouldSkipConfirmation(options)) {
    return
  }

  if (options.interactive !== true) {
    throw new ValidationError(message, {
      suggestion: USE_YES_SUGGESTION,
    })
  }

  if (
    !Deno.stdin.isTerminal() || !Deno.stdout.isTerminal() ||
    !shouldAllowInteractivePrompts()
  ) {
    throw new ValidationError(message, {
      suggestion: USE_YES_SUGGESTION,
    })
  }
}
