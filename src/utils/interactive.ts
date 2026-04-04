import { shouldAllowInteractivePrompts } from "./execution_profile.ts"
import { ValidationError } from "./errors.ts"

export const INTERACTIVE_REQUIRED_SUGGESTION =
  "v3 no longer enables prompts by default. Pass --profile human-debug --interactive to restore terminal prompts, or provide explicit flags/stdin."

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
        "v3 defaults to the agent-safe profile. Pass --profile human-debug --interactive to restore terminal prompts, or provide explicit flags/stdin.",
    })
  }
}
