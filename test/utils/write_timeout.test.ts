import { assertEquals, assertRejects } from "@std/assert"
import {
  AGENT_SAFE_PROFILE,
  AGENT_SAFE_WRITE_TIMEOUT_MS,
  getCliExecutionProfile,
  HUMAN_DEBUG_PROFILE,
  setCliExecutionProfile,
} from "../../src/utils/execution_profile.ts"
import {
  buildWriteTimeoutSuggestion,
  DEFAULT_WRITE_TIMEOUT_MS,
  resolveWriteTimeoutMs,
  withWriteTimeout,
  WRITE_TIMEOUT_ENV_VAR,
} from "../../src/utils/write_timeout.ts"
import { ValidationError, WriteTimeoutError } from "../../src/utils/errors.ts"

Deno.test("resolveWriteTimeoutMs uses the agent-safe default when no flag or env is set", () => {
  const originalProfile = getCliExecutionProfile()
  Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  setCliExecutionProfile(undefined)

  try {
    assertEquals(resolveWriteTimeoutMs(), AGENT_SAFE_WRITE_TIMEOUT_MS)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("resolveWriteTimeoutMs uses the agent-safe default when the profile is active", () => {
  const originalProfile = getCliExecutionProfile()
  Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  setCliExecutionProfile(AGENT_SAFE_PROFILE)

  try {
    assertEquals(resolveWriteTimeoutMs(), AGENT_SAFE_WRITE_TIMEOUT_MS)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("resolveWriteTimeoutMs uses the human-debug default when that profile is active", () => {
  const originalProfile = getCliExecutionProfile()
  Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  setCliExecutionProfile(HUMAN_DEBUG_PROFILE)

  try {
    assertEquals(resolveWriteTimeoutMs(), DEFAULT_WRITE_TIMEOUT_MS)
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("resolveWriteTimeoutMs prefers the explicit flag value", () => {
  Deno.env.set(WRITE_TIMEOUT_ENV_VAR, "120000")
  try {
    assertEquals(resolveWriteTimeoutMs(45000), 45000)
  } finally {
    Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  }
})

Deno.test("resolveWriteTimeoutMs reads LINEAR_WRITE_TIMEOUT_MS", () => {
  Deno.env.set(WRITE_TIMEOUT_ENV_VAR, "45000")
  try {
    assertEquals(resolveWriteTimeoutMs(), 45000)
  } finally {
    Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  }
})

Deno.test("resolveWriteTimeoutMs rejects invalid LINEAR_WRITE_TIMEOUT_MS", async () => {
  Deno.env.set(WRITE_TIMEOUT_ENV_VAR, "0")
  try {
    await assertRejects(
      async () => {
        await Promise.resolve()
        resolveWriteTimeoutMs()
      },
      ValidationError,
      `${WRITE_TIMEOUT_ENV_VAR} must be a positive integer number of milliseconds`,
    )
  } finally {
    Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  }
})

Deno.test("withWriteTimeout throws WriteTimeoutError with stable details", async () => {
  const error = await assertRejects(
    async () => {
      await withWriteTimeout(
        async (_signal) => {
          await new Promise(() => {})
          return "never"
        },
        {
          operation: "issue update",
          timeoutMs: 10,
        },
      )
    },
    WriteTimeoutError,
  )

  assertEquals(
    error.userMessage,
    "Timed out waiting for issue update confirmation after 10ms. The write may still have been accepted by Linear.",
  )
  assertEquals(error.details, {
    failureMode: "timeout_waiting_for_confirmation",
    timeoutMs: 10,
    operation: "issue update",
    outcome: "unknown",
    appliedState: "unknown",
    callerGuidance: {
      nextAction: "reconcile_before_retry",
      readBeforeRetry: true,
    },
  })
})

Deno.test("buildWriteTimeoutSuggestion omits profile hints under the default agent-safe runtime", () => {
  const originalProfile = getCliExecutionProfile()
  setCliExecutionProfile(undefined)

  try {
    assertEquals(
      buildWriteTimeoutSuggestion(),
      "Check Linear before retrying. Increase the timeout with --timeout-ms or LINEAR_WRITE_TIMEOUT_MS if this write path is consistently slow.",
    )
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("buildWriteTimeoutSuggestion matches explicit agent-safe mode", () => {
  const originalProfile = getCliExecutionProfile()
  setCliExecutionProfile(AGENT_SAFE_PROFILE)

  try {
    assertEquals(
      buildWriteTimeoutSuggestion(),
      "Check Linear before retrying. Increase the timeout with --timeout-ms or LINEAR_WRITE_TIMEOUT_MS if this write path is consistently slow.",
    )
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})

Deno.test("buildWriteTimeoutSuggestion mentions the longer agent-safe timeout under human-debug", () => {
  const originalProfile = getCliExecutionProfile()
  setCliExecutionProfile(HUMAN_DEBUG_PROFILE)

  try {
    assertEquals(
      buildWriteTimeoutSuggestion(),
      "Check Linear before retrying. Rerun without --profile human-debug for the longer agent-safe timeout, or increase the timeout with --timeout-ms or LINEAR_WRITE_TIMEOUT_MS if this write path is consistently slow.",
    )
  } finally {
    setCliExecutionProfile(originalProfile)
  }
})
