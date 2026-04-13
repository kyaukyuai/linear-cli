import { assertEquals, assertStringIncludes } from "@std/assert"
import {
  buildExternalContextPayload,
  deriveTitleFromExternalContext,
  readExternalContextFromFile,
  renderExternalContextMarkdown,
} from "../../src/utils/external_context.ts"

Deno.test("external context file loads normalized envelope", async () => {
  const context = await readExternalContextFromFile(
    "test/fixtures/external-context/slack-thread.json",
  )

  assertEquals(context.version, "v1")
  assertEquals(context.source.system, "slack")
  assertEquals(context.source.ref, "C12345:1712382000.100200")
  assertEquals(context.participants.length, 2)
  assertEquals(context.textBlocks.length, 2)
  assertEquals(context.attachments.length, 1)
  assertEquals(context.triage?.team, "ENG")
  assertEquals(context.triage?.state, "triage")
  assertEquals(context.triage?.labels, ["customer", "incident"])
  assertEquals(context.triage?.duplicateIssueRefs, ["ENG-88"])
  assertEquals(context.triage?.relatedIssueRefs, ["ENG-42"])
  assertEquals(context.metadata.customerId, "cust_123")
})

Deno.test("external context derives issue titles and renders markdown", async () => {
  const context = await readExternalContextFromFile(
    "test/fixtures/external-context/slack-thread.json",
  )

  assertEquals(
    deriveTitleFromExternalContext(context),
    "Customer reports auth refresh failures",
  )

  const markdown = renderExternalContextMarkdown(context)
  assertStringIncludes(markdown, "## Source Context")
  assertStringIncludes(markdown, "- System: slack")
  assertStringIncludes(markdown, "### Summary")
  assertStringIncludes(markdown, "### Text Blocks")
  assertStringIncludes(markdown, "### Participants")
  assertStringIncludes(markdown, "### Attachments")
  assertStringIncludes(markdown, "### Metadata")
})

Deno.test("external context payload exposes deterministic summary fields", async () => {
  const context = await readExternalContextFromFile(
    "test/fixtures/external-context/slack-thread.json",
  )

  assertEquals(
    buildExternalContextPayload(context, "comment"),
    {
      version: "v1",
      target: "comment",
      source: {
        system: "slack",
        ref: "C12345:1712382000.100200",
        url: "https://example.slack.com/archives/C12345/p1712382000100200",
        title: "Customer reports auth refresh failures",
        capturedAt: "2026-04-12T10:00:00Z",
      },
      title: null,
      summary:
        "A customer thread reports repeated auth refresh failures after the latest deploy.",
      participantCount: 2,
      textBlockCount: 2,
      attachmentCount: 1,
      metadataKeys: ["customerId", "severity"],
    },
  )
})
