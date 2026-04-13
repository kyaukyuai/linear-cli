import { ValidationError } from "./errors.ts"
import type { OperationReceiptSourceProvenance } from "./operation_receipt.ts"

type ExternalContextMetadataValue = string | number | boolean | null

type ExternalContextTriage = {
  team: string | null
  state: string | null
  labels: string[]
  duplicateIssueRefs: string[]
  relatedIssueRefs: string[]
}

type ExternalContextParticipant = {
  name: string
  handle: string | null
  role: string | null
}

type ExternalContextTextBlock = {
  label: string | null
  author: string | null
  text: string
  timestamp: string | null
}

type ExternalContextAttachment = {
  title: string | null
  url: string | null
  mimeType: string | null
}

export type ExternalContextEnvelope = {
  version: "v1"
  source: {
    system: string
    ref: string | null
    url: string | null
    title: string | null
    capturedAt: string | null
  }
  title: string | null
  summary: string | null
  body: string | null
  participants: ExternalContextParticipant[]
  textBlocks: ExternalContextTextBlock[]
  attachments: ExternalContextAttachment[]
  metadata: Record<string, ExternalContextMetadataValue>
  triage: ExternalContextTriage | null
}

export type ExternalContextTarget = "description" | "comment"

export type ExternalContextPayload = {
  version: "v1"
  target: ExternalContextTarget
  source: ExternalContextEnvelope["source"]
  title: string | null
  summary: string | null
  participantCount: number
  textBlockCount: number
  attachmentCount: number
  metadataKeys: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function expectRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ValidationError(
      `External context field ${path} must be an object`,
      {
        suggestion:
          "Use a normalized JSON envelope with object fields like source, metadata, or attachments.",
      },
    )
  }

  return value
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = record[key]

  if (value == null) {
    return null
  }

  if (typeof value !== "string") {
    throw new ValidationError(
      `External context field ${path}.${key} must be a string`,
    )
  }

  return value
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key]

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `External context field ${path}.${key} must be a non-empty string`,
    )
  }

  return value
}

function readParticipants(value: unknown): ExternalContextParticipant[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      "External context field participants must be an array",
    )
  }

  return value.map((entry, index) => {
    const record = expectRecord(entry, `participants[${index}]`)

    return {
      name: readRequiredString(record, "name", `participants[${index}]`),
      handle: readOptionalString(record, "handle", `participants[${index}]`),
      role: readOptionalString(record, "role", `participants[${index}]`),
    }
  })
}

function readTextBlocks(value: unknown): ExternalContextTextBlock[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      "External context field textBlocks must be an array",
    )
  }

  return value.map((entry, index) => {
    const record = expectRecord(entry, `textBlocks[${index}]`)

    return {
      label: readOptionalString(record, "label", `textBlocks[${index}]`),
      author: readOptionalString(record, "author", `textBlocks[${index}]`),
      text: readRequiredString(record, "text", `textBlocks[${index}]`),
      timestamp: readOptionalString(
        record,
        "timestamp",
        `textBlocks[${index}]`,
      ),
    }
  })
}

function readAttachments(value: unknown): ExternalContextAttachment[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      "External context field attachments must be an array",
    )
  }

  return value.map((entry, index) => {
    const record = expectRecord(entry, `attachments[${index}]`)

    return {
      title: readOptionalString(record, "title", `attachments[${index}]`),
      url: readOptionalString(record, "url", `attachments[${index}]`),
      mimeType: readOptionalString(record, "mimeType", `attachments[${index}]`),
    }
  })
}

function readMetadata(
  value: unknown,
): Record<string, ExternalContextMetadataValue> {
  if (value == null) {
    return {}
  }

  const record = expectRecord(value, "metadata")
  const metadata: Record<string, ExternalContextMetadataValue> = {}

  for (const [key, entry] of Object.entries(record)) {
    if (entry === undefined) {
      throw new ValidationError(
        `External context metadata.${key} must not be undefined`,
      )
    }

    if (
      typeof entry === "string" || typeof entry === "number" ||
      typeof entry === "boolean" || entry == null
    ) {
      metadata[key] = entry
      continue
    }

    throw new ValidationError(
      `External context metadata.${key} must be a string, number, boolean, or null`,
    )
  }

  return metadata
}

function readStringArray(
  value: unknown,
  path: string,
): string[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      `External context field ${path} must be an array`,
    )
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new ValidationError(
        `External context field ${path}[${index}] must be a non-empty string`,
      )
    }

    return entry.trim()
  })
}

function readTriage(
  value: unknown,
): ExternalContextTriage | null {
  if (value == null) {
    return null
  }

  const record = expectRecord(value, "triage")
  const team = readOptionalString(record, "team", "triage")
  const state = readOptionalString(record, "state", "triage")
  const labels = readStringArray(record.labels, "triage.labels")
  const duplicateIssueRefs = readStringArray(
    record.duplicateIssueRefs,
    "triage.duplicateIssueRefs",
  )
  const relatedIssueRefs = readStringArray(
    record.relatedIssueRefs,
    "triage.relatedIssueRefs",
  )

  if (
    team == null && state == null && labels.length === 0 &&
    duplicateIssueRefs.length === 0 && relatedIssueRefs.length === 0
  ) {
    return null
  }

  return {
    team,
    state,
    labels,
    duplicateIssueRefs,
    relatedIssueRefs,
  }
}

function hasRenderableContent(context: ExternalContextEnvelope): boolean {
  return context.title != null ||
    context.summary != null ||
    context.body != null ||
    context.textBlocks.length > 0 ||
    context.attachments.length > 0 ||
    context.participants.length > 0 ||
    Object.keys(context.metadata).length > 0
}

export async function readExternalContextFromFile(
  path: string,
): Promise<ExternalContextEnvelope> {
  let text: string
  try {
    text = await Deno.readTextFile(path)
  } catch (error) {
    throw new ValidationError(`Failed to read external context file: ${path}`, {
      suggestion: error instanceof Error ? error.message : String(error),
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new ValidationError(
      `External context file is not valid JSON: ${path}`,
      {
        suggestion: error instanceof Error ? error.message : String(error),
      },
    )
  }

  const record = expectRecord(parsed, "root")
  const version = readOptionalString(record, "version", "root") ?? "v1"
  if (version !== "v1") {
    throw new ValidationError(
      `Unsupported external context version: ${version}`,
      {
        suggestion:
          'Use version "v1" for normalized external context envelopes.',
      },
    )
  }

  const sourceRecord = expectRecord(record.source, "source")
  const context: ExternalContextEnvelope = {
    version: "v1",
    source: {
      system: readRequiredString(sourceRecord, "system", "source"),
      ref: readOptionalString(sourceRecord, "ref", "source"),
      url: readOptionalString(sourceRecord, "url", "source"),
      title: readOptionalString(sourceRecord, "title", "source"),
      capturedAt: readOptionalString(sourceRecord, "capturedAt", "source"),
    },
    title: readOptionalString(record, "title", "root"),
    summary: readOptionalString(record, "summary", "root"),
    body: readOptionalString(record, "body", "root"),
    participants: readParticipants(record.participants),
    textBlocks: readTextBlocks(record.textBlocks),
    attachments: readAttachments(record.attachments),
    metadata: readMetadata(record.metadata),
    triage: readTriage(record.triage),
  }

  if (!hasRenderableContent(context)) {
    throw new ValidationError(
      "External context must include title, summary, body, text blocks, participants, attachments, or metadata",
      {
        suggestion:
          "Provide at least one context field so the CLI can render a deterministic description or comment.",
      },
    )
  }

  return context
}

export function deriveTitleFromExternalContext(
  context: ExternalContextEnvelope,
): string | null {
  return context.title ?? context.source.title
}

function pushSection(
  lines: string[],
  heading: string,
  content: string | null,
): void {
  if (content == null || content.trim().length === 0) {
    return
  }

  lines.push("")
  lines.push(`### ${heading}`)
  lines.push(content.trim())
}

export function renderExternalContextMarkdown(
  context: ExternalContextEnvelope,
): string {
  const lines = [
    "## Source Context",
    `- System: ${context.source.system}`,
  ]

  if (context.source.ref != null) {
    lines.push(`- Ref: ${context.source.ref}`)
  }
  if (context.source.url != null) {
    lines.push(`- URL: ${context.source.url}`)
  }
  if (context.source.capturedAt != null) {
    lines.push(`- Captured At: ${context.source.capturedAt}`)
  }

  pushSection(lines, "Title", context.title ?? context.source.title)
  pushSection(lines, "Summary", context.summary)
  pushSection(lines, "Body", context.body)

  if (context.textBlocks.length > 0) {
    lines.push("")
    lines.push("### Text Blocks")
    for (const [index, block] of context.textBlocks.entries()) {
      const label = block.label ?? `Block ${index + 1}`
      const qualifiers = [block.author, block.timestamp].filter((value) =>
        value != null && value.length > 0
      )
      lines.push(
        qualifiers.length > 0
          ? `#### ${label} (${qualifiers.join(", ")})`
          : `#### ${label}`,
      )
      lines.push(block.text.trim())
    }
  }

  if (context.participants.length > 0) {
    lines.push("")
    lines.push("### Participants")
    for (const participant of context.participants) {
      const parts = [participant.name]
      if (participant.handle != null) {
        parts.push(`@${participant.handle}`)
      }
      if (participant.role != null) {
        parts.push(`(${participant.role})`)
      }
      lines.push(`- ${parts.join(" ")}`)
    }
  }

  if (context.attachments.length > 0) {
    lines.push("")
    lines.push("### Attachments")
    for (const attachment of context.attachments) {
      const title = attachment.title ?? attachment.url ?? "attachment"
      const suffix = attachment.mimeType == null
        ? ""
        : ` (${attachment.mimeType})`
      lines.push(`- ${title}${suffix}`)
      if (attachment.url != null && attachment.url !== title) {
        lines.push(`  URL: ${attachment.url}`)
      }
    }
  }

  if (Object.keys(context.metadata).length > 0) {
    lines.push("")
    lines.push("### Metadata")
    for (const [key, value] of Object.entries(context.metadata)) {
      lines.push(`- ${key}: ${String(value)}`)
    }
  }

  return `${lines.join("\n")}\n`
}

export function buildExternalContextPayload(
  context: ExternalContextEnvelope,
  target: ExternalContextTarget,
): ExternalContextPayload {
  return {
    version: "v1",
    target,
    source: context.source,
    title: context.title,
    summary: context.summary,
    participantCount: context.participants.length,
    textBlockCount: context.textBlocks.length,
    attachmentCount: context.attachments.length,
    metadataKeys: Object.keys(context.metadata),
  }
}

function dedupeStrings(values: Array<string | null>): string[] {
  const definedValues = values.filter((value): value is string =>
    value != null && value.length > 0
  )

  return [
    ...new Set(definedValues),
  ]
}

function buildContextIds(
  metadata: Record<string, ExternalContextMetadataValue>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      const looksLikeContextId = key === "id" ||
        key.endsWith("Id") ||
        key.endsWith("_id") ||
        key.endsWith("ID")

      if (!looksLikeContextId || value == null) {
        return []
      }

      if (typeof value === "string" || typeof value === "number") {
        return [[key, String(value)]]
      }

      return []
    }),
  )
}

export function buildExternalContextSourceProvenance(
  context: ExternalContextEnvelope,
  target: ExternalContextTarget,
  options?: {
    triageApplied?: boolean
  },
): OperationReceiptSourceProvenance {
  const attachmentUrls = dedupeStrings(
    context.attachments.map((attachment) => attachment.url),
  )

  return {
    version: "v1",
    target,
    source: context.source,
    contextIds: buildContextIds(context.metadata),
    evidenceRefs: attachmentUrls,
    relatedUrls: dedupeStrings([context.source.url, ...attachmentUrls]),
    participantHandles: dedupeStrings(
      context.participants.map((participant) => participant.handle),
    ),
    metadataKeys: Object.keys(context.metadata),
    triage: context.triage == null ? null : {
      applied: options?.triageApplied ?? false,
      team: context.triage.team,
      state: context.triage.state,
      labels: context.triage.labels,
      duplicateIssueRefs: context.triage.duplicateIssueRefs,
      relatedIssueRefs: context.triage.relatedIssueRefs,
    },
  }
}
