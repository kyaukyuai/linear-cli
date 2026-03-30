import { assertEquals, assertRejects } from "@std/assert"
import {
  DEFAULT_WRITE_TIMEOUT_MS,
  resolveWriteTimeoutMs,
  withWriteTimeout,
  WRITE_TIMEOUT_ENV_VAR,
} from "../../src/utils/write_timeout.ts"
import { ValidationError, WriteTimeoutError } from "../../src/utils/errors.ts"

Deno.test("resolveWriteTimeoutMs uses the default when no flag or env is set", () => {
  Deno.env.delete(WRITE_TIMEOUT_ENV_VAR)
  assertEquals(resolveWriteTimeoutMs(), DEFAULT_WRITE_TIMEOUT_MS)
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
  })
})
