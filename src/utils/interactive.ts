import { shouldAllowInteractivePrompts } from "./execution_profile.ts"
import { ValidationError } from "./errors.ts"

export const INTERACTIVE_REQUIRED_SUGGESTION =
  "Pass --interactive to enable prompts in a terminal, or provide explicit flags/stdin."

export type InteractiveOptions = {
  interactive?: boolean
}

export function ensureInteractiveInputAvailable(
  options: InteractiveOptions,
  message = "Interactive input required",
  suggestion = INTERACTIVE_REQUIRED_SUGGESTION,
): void {
  if (options.interactive !== true) {
    throw new ValidationError(message, {
      suggestion,
    })
  }

  if (!Deno.stdin.isTerminal() || !Deno.stdout.isTerminal()) {
    throw new ValidationError(message, {
      suggestion,
    })
  }

  if (!shouldAllowInteractivePrompts()) {
    throw new ValidationError(message, {
      suggestion:
        "Interactive prompts are disabled by the current execution profile. Provide explicit flags/stdin instead.",
    })
  }
}
