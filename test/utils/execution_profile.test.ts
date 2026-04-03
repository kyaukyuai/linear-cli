import { assertEquals, assertThrows } from "@std/assert"
import {
  AGENT_SAFE_PROFILE,
  AGENT_SAFE_WRITE_TIMEOUT_MS,
  getCliExecutionProfile,
  HUMAN_DEBUG_PROFILE,
  parseExecutionProfile,
  setCliExecutionProfile,
  shouldAllowInteractivePrompts,
  shouldDisablePagerByDefault,
} from "../../src/utils/execution_profile.ts"
import { ValidationError } from "../../src/utils/errors.ts"

Deno.test("parseExecutionProfile accepts agent-safe", () => {
  assertEquals(parseExecutionProfile("agent-safe"), AGENT_SAFE_PROFILE)
})

Deno.test("parseExecutionProfile accepts human-debug", () => {
  assertEquals(parseExecutionProfile("human-debug"), HUMAN_DEBUG_PROFILE)
})

Deno.test("parseExecutionProfile rejects unsupported profiles", () => {
  assertThrows(
    () => parseExecutionProfile("interactive"),
    ValidationError,
    "Unsupported execution profile: interactive",
  )
})

Deno.test("agent-safe profile toggles execution defaults", () => {
  const originalProfile = getCliExecutionProfile()

  try {
    setCliExecutionProfile(AGENT_SAFE_PROFILE)

    assertEquals(shouldDisablePagerByDefault(), true)
    assertEquals(shouldAllowInteractivePrompts(), false)
    assertEquals(AGENT_SAFE_WRITE_TIMEOUT_MS, 45_000)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("human-debug profile enables pager and prompts", () => {
  const originalProfile = getCliExecutionProfile()

  try {
    setCliExecutionProfile(HUMAN_DEBUG_PROFILE)

    assertEquals(shouldDisablePagerByDefault(), false)
    assertEquals(shouldAllowInteractivePrompts(), true)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("default profile now uses agent-safe execution semantics", () => {
  const originalProfile = getCliExecutionProfile()

  try {
    setCliExecutionProfile(undefined)

    assertEquals(shouldDisablePagerByDefault(), true)
    assertEquals(shouldAllowInteractivePrompts(), false)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})
