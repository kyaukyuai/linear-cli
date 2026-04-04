import { assertEquals, assertThrows } from "@std/assert"
import {
  ensureInteractiveInputAvailable,
  INTERACTIVE_REQUIRED_SUGGESTION,
} from "../../src/utils/interactive.ts"
import {
  AGENT_SAFE_PROFILE,
  getCliExecutionProfile,
  HUMAN_DEBUG_PROFILE,
  setCliExecutionProfile,
} from "../../src/utils/execution_profile.ts"
import { ValidationError } from "../../src/utils/errors.ts"

Deno.test("ensureInteractiveInputAvailable rejects missing interactive opt-in", () => {
  const error = assertThrows(
    () => ensureInteractiveInputAvailable({}),
    ValidationError,
    "Interactive input required",
  )

  assertEquals(error.suggestion, INTERACTIVE_REQUIRED_SUGGESTION)
})

Deno.test("ensureInteractiveInputAvailable explains v3 profile default", () => {
  const originalStdinIsTerminal = Deno.stdin.isTerminal
  const originalStdoutIsTerminal = Deno.stdout.isTerminal
  const originalProfile = getCliExecutionProfile()

  Deno.stdin.isTerminal = () => true
  Deno.stdout.isTerminal = () => true
  setCliExecutionProfile(AGENT_SAFE_PROFILE)

  try {
    const error = assertThrows(
      () => ensureInteractiveInputAvailable({ interactive: true }),
      ValidationError,
      "Interactive input required",
    )

    assertEquals(
      error.suggestion,
      "v3 defaults to the agent-safe profile. Pass --profile human-debug --interactive to restore terminal prompts, or provide explicit flags/stdin.",
    )
  } finally {
    Deno.stdin.isTerminal = originalStdinIsTerminal
    Deno.stdout.isTerminal = originalStdoutIsTerminal
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("ensureInteractiveInputAvailable allows explicit human-debug mode", () => {
  const originalStdinIsTerminal = Deno.stdin.isTerminal
  const originalStdoutIsTerminal = Deno.stdout.isTerminal
  const originalProfile = getCliExecutionProfile()

  Deno.stdin.isTerminal = () => true
  Deno.stdout.isTerminal = () => true
  setCliExecutionProfile(HUMAN_DEBUG_PROFILE)

  try {
    ensureInteractiveInputAvailable({ interactive: true })
  } finally {
    Deno.stdin.isTerminal = originalStdinIsTerminal
    Deno.stdout.isTerminal = originalStdoutIsTerminal
    setCliExecutionProfile(originalProfile)
  }
})
