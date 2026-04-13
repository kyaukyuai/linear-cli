import { assertEquals, assertThrows } from "@std/assert"
import {
  defaultsToJsonOutput,
  resolveJsonOutputMode,
} from "../../src/utils/output_mode.ts"
import { ValidationError } from "../../src/utils/errors.ts"

Deno.test("defaultsToJsonOutput tracks v3 default-json surfaces", () => {
  assertEquals(defaultsToJsonOutput("linear issue view"), true)
  assertEquals(defaultsToJsonOutput("linear resolve pack"), true)
  assertEquals(defaultsToJsonOutput("linear team list"), false)
})

Deno.test("resolveJsonOutputMode explains v3 default-json conflicts", () => {
  const error = assertThrows(
    () =>
      resolveJsonOutputMode("linear issue view", {
        json: true,
        text: true,
      }),
    ValidationError,
    "Cannot use --json with --text",
  )

  assertEquals(
    error.suggestion,
    "This command defaults to machine-readable output in v3. Omit both flags for JSON, or pass --text for human-readable output.",
  )
})

Deno.test("resolveJsonOutputMode keeps non-default-json guidance unchanged", () => {
  const error = assertThrows(
    () =>
      resolveJsonOutputMode("linear team list", {
        json: true,
        text: true,
      }),
    ValidationError,
    "Cannot use --json with --text",
  )

  assertEquals(
    error.suggestion,
    "Use either --json for machine-readable output or --text for human-readable output.",
  )
})
