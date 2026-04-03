import { assertEquals, assertThrows } from "@std/assert"
import {
  ensureInteractiveConfirmationAvailable,
  USE_YES_SUGGESTION,
} from "../../src/utils/confirmation.ts"
import {
  getCliExecutionProfile,
  HUMAN_DEBUG_PROFILE,
  setCliExecutionProfile,
} from "../../src/utils/execution_profile.ts"
import { ValidationError } from "../../src/utils/errors.ts"

Deno.test("ensureInteractiveConfirmationAvailable allows bypass flags", () => {
  ensureInteractiveConfirmationAvailable({ yes: true })
  ensureInteractiveConfirmationAvailable({ force: true })
  ensureInteractiveConfirmationAvailable({ confirm: true })
})

Deno.test("ensureInteractiveConfirmationAvailable rejects non-interactive confirmation", () => {
  const originalIsTerminal = Deno.stdin.isTerminal

  Deno.stdin.isTerminal = () => false
  try {
    const error = assertThrows(
      () => ensureInteractiveConfirmationAvailable({}),
      ValidationError,
      "Interactive confirmation required",
    )

    assertEquals(error.suggestion, USE_YES_SUGGESTION)
  } finally {
    Deno.stdin.isTerminal = originalIsTerminal
  }
})

Deno.test("ensureInteractiveConfirmationAvailable allows explicit interactive confirmation", () => {
  const originalStdinIsTerminal = Deno.stdin.isTerminal
  const originalStdoutIsTerminal = Deno.stdout.isTerminal
  const originalProfile = getCliExecutionProfile()

  Deno.stdin.isTerminal = () => true
  Deno.stdout.isTerminal = () => true
  setCliExecutionProfile(HUMAN_DEBUG_PROFILE)

  try {
    ensureInteractiveConfirmationAvailable({ interactive: true })
  } finally {
    Deno.stdin.isTerminal = originalStdinIsTerminal
    Deno.stdout.isTerminal = originalStdoutIsTerminal
    setCliExecutionProfile(originalProfile)
  }
})
