/**
 * Read raw text content from stdin when input is piped.
 *
 * Returns `undefined` when stdin is a TTY, when no bytes are available before
 * the timeout, or when the piped input is empty.
 */
export async function readTextFromStdin(
  options: { timeoutMs?: number } = {},
): Promise<string | undefined> {
  if (Deno.stdin.isTerminal()) {
    return undefined
  }

  if (
    Deno.env.get("SNAPSHOT_TEST_NAME") != null &&
    Deno.env.get("LINEAR_SNAPSHOT_STDIN") !== "1"
  ) {
    return undefined
  }

  const timeoutMs = options.timeoutMs ?? 100
  const reader = Deno.stdin.readable.getReader()

  try {
    const firstRead = reader.read()
    const firstChunk = timeoutMs <= 0 ? await firstRead : await Promise.race([
      firstRead,
      new Promise<undefined>((resolve) => {
        setTimeout(() => resolve(undefined), timeoutMs)
      }),
    ])

    if (firstChunk == null) {
      await reader.cancel()
      await firstRead.catch(() => undefined)
      return undefined
    }

    if (firstChunk.done || firstChunk.value == null) {
      return undefined
    }

    const chunks: Uint8Array[] = [firstChunk.value]

    while (true) {
      const chunk = await reader.read()
      if (chunk.done || chunk.value == null) {
        break
      }
      chunks.push(chunk.value)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const text = new TextDecoder().decode(combined)
    return text.length > 0 ? text : undefined
  } finally {
    reader.releaseLock()
  }
}
