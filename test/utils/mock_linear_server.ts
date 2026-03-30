/**
 * Mock Linear API server for testing
 *
 * Usage:
 * const server = new MockLinearServer([
 *   {
 *     queryName: "GetIssueDetails",
 *     variables: { id: "TEST-123" },
 *     response: { data: { issue: { title: "Test Issue", ... } } }
 *   }
 * ]);
 */

interface MockResponse {
  queryName: string
  variables?: Record<string, unknown>
  response: Record<string, unknown>
  status?: number
  headers?: Record<string, string>
  delayMs?: number
  consume?: boolean
}

export class MockLinearServer {
  private server?: Deno.HttpServer
  private port = 0
  private mockResponses: MockResponse[]

  constructor(responses: MockResponse[] = []) {
    this.mockResponses = responses
  }

  async start(): Promise<void> {
    this.server = Deno.serve(
      {
        hostname: "127.0.0.1",
        port: 0,
        onListen: () => {},
      },
      (request) => {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          })
        }

        // Handle GraphQL requests
        if (
          request.method === "POST" &&
          new URL(request.url).pathname === "/graphql"
        ) {
          return this.handleGraphQL(request)
        }

        return new Response("Not Found", { status: 404 })
      },
    )

    if ("port" in this.server.addr) {
      this.port = this.server.addr.port
    }

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.shutdown()
      this.server = undefined
    }
  }

  getEndpoint(): string {
    return `http://localhost:${this.port}/graphql`
  }

  private async handleGraphQL(request: Request): Promise<Response> {
    const defaultHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // Use fixed date header for deterministic snapshot tests
      "Date": "Mon, 01 Jan 2024 00:00:00 GMT",
    }

    try {
      const body = await request.json()
      const { query, variables } = body

      // Find matching mock response
      const mockResponse = this.findMatchingResponse(query, variables)

      if (mockResponse) {
        if (mockResponse.delayMs != null && mockResponse.delayMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, mockResponse.delayMs)
          )
        }
        const headers = {
          ...defaultHeaders,
          ...mockResponse.headers,
        }
        return new Response(
          JSON.stringify(mockResponse.response),
          { status: mockResponse.status ?? 200, headers },
        )
      }

      // Default response for unhandled queries
      return new Response(
        JSON.stringify({
          errors: [{
            message: "No mock response configured for this query",
            extensions: {
              code: "NO_MOCK_CONFIGURED",
              query: this.extractQueryName(query),
              variables,
            },
          }],
        }),
        { status: 200, headers: defaultHeaders },
      )
    } catch (_error) {
      return new Response(
        JSON.stringify({
          errors: [{
            message: "Invalid JSON in request body",
            extensions: { code: "BAD_REQUEST" },
          }],
        }),
        { status: 400, headers: defaultHeaders },
      )
    }
  }

  private findMatchingResponse(
    query: string,
    variables: Record<string, unknown> = {},
  ): MockResponse | undefined {
    const queryName = this.extractQueryName(query)

    for (const [index, mock] of this.mockResponses.entries()) {
      // Check if query name matches
      if (mock.queryName !== queryName) {
        continue
      }

      // If no variables specified in mock, match any variables
      if (!mock.variables) {
        if (mock.consume) {
          return this.mockResponses.splice(index, 1)[0]
        }
        return mock
      }

      // Check if all mock variables match the request variables (deep comparison)
      const matches = Object.entries(mock.variables).every(([key, value]) => {
        return this.deepEqual(variables[key], value)
      })
      if (!matches) {
        continue
      }

      if (mock.consume) {
        return this.mockResponses.splice(index, 1)[0]
      }
      return mock
    }

    return undefined
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false
    if (typeof a !== "object") return a === b

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)

    if (aKeys.length !== bKeys.length) return false

    return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]))
  }

  private extractQueryName(query: string): string {
    // Extract query name from GraphQL query string
    // Examples: "query GetIssueDetails" -> "GetIssueDetails"
    const match = query.match(/(?:query|mutation)\s+(\w+)/)
    return match?.[1] || "UnknownQuery"
  }

  addResponse(response: MockResponse): void {
    this.mockResponses.push(response)
  }

  clearResponses(): void {
    this.mockResponses = []
  }
}
