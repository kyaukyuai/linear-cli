import { assertEquals } from "@std/assert"
import {
  buildDryRunJsonEnvelope,
  emitDryRunOutput,
  runWithDryRun,
} from "../../src/utils/dry_run.ts"

Deno.test("buildDryRunJsonEnvelope wraps preview data in stable shape", () => {
  assertEquals(
    buildDryRunJsonEnvelope(
      { id: "issue-123", title: "Preview issue" },
      "Would create issue ENG-123",
    ),
    {
      success: true,
      dryRun: true,
      summary: "Would create issue ENG-123",
      data: { id: "issue-123", title: "Preview issue" },
    },
  )
})

Deno.test("emitDryRunOutput prints one JSON document when json is enabled", () => {
  const originalLog = console.log
  const messages: string[] = []
  console.log = (...args: unknown[]) => {
    messages.push(args.map((arg) => String(arg)).join(" "))
  }

  try {
    emitDryRunOutput({
      json: true,
      summary: "Would update issue ENG-123",
      data: { id: "issue-123" },
    })
  } finally {
    console.log = originalLog
  }

  assertEquals(messages.length, 1)
  assertEquals(JSON.parse(messages[0]), {
    success: true,
    dryRun: true,
    summary: "Would update issue ENG-123",
    data: { id: "issue-123" },
  })
})

Deno.test("emitDryRunOutput prints readable preview in terminal mode", () => {
  const originalLog = console.log
  const messages: string[] = []
  console.log = (...args: unknown[]) => {
    messages.push(args.map((arg) => String(arg)).join(" "))
  }

  try {
    emitDryRunOutput({
      summary: "Would update issue ENG-123",
      data: { id: "issue-123" },
      lines: ["- state: Todo -> In Progress", "- assignee: self"],
    })
  } finally {
    console.log = originalLog
  }

  assertEquals(messages, [
    "Dry run: Would update issue ENG-123",
    "- state: Todo -> In Progress",
    "- assignee: self",
  ])
})

Deno.test("runWithDryRun skips execute callback when dryRun is enabled", async () => {
  let previewCalls = 0
  let executeCalls = 0

  const result = await runWithDryRun({
    dryRun: true,
    buildPreview: () => {
      previewCalls++
      return { id: "preview-123" }
    },
    execute: () => {
      executeCalls++
      return { id: "execute-123" }
    },
  })

  assertEquals(previewCalls, 1)
  assertEquals(executeCalls, 0)
  assertEquals(result, {
    dryRun: true,
    value: { id: "preview-123" },
  })
})

Deno.test("runWithDryRun executes mutation callback when dryRun is disabled", async () => {
  let previewCalls = 0
  let executeCalls = 0

  const result = await runWithDryRun({
    dryRun: false,
    buildPreview: () => {
      previewCalls++
      return { id: "preview-123" }
    },
    execute: () => {
      executeCalls++
      return { id: "execute-123" }
    },
  })

  assertEquals(previewCalls, 0)
  assertEquals(executeCalls, 1)
  assertEquals(result, {
    dryRun: false,
    value: { id: "execute-123" },
  })
})
