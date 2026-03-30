import { snapshotTest } from "@cliffy/testing"
import { listCommand } from "../../../src/commands/project-label/project-label-list.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Label List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Project Label List Command - Shows Labels",
  meta: import.meta,
  colors: false,
  args: [],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectLabels",
        response: {
          data: {
            projectLabels: {
              nodes: [
                {
                  id: "plabel-1",
                  name: "Customer-facing",
                  description: "Visible in roadmap and updates",
                  color: "#5E6AD2",
                  isGroup: false,
                  createdAt: "2026-03-15T10:00:00Z",
                  updatedAt: "2026-03-15T10:00:00Z",
                  archivedAt: null,
                  retiredAt: null,
                  parent: null,
                },
                {
                  id: "plabel-2",
                  name: "Platform",
                  description: null,
                  color: "#2F80ED",
                  isGroup: true,
                  createdAt: "2026-03-15T10:00:00Z",
                  updatedAt: "2026-03-15T10:00:00Z",
                  archivedAt: null,
                  retiredAt: null,
                  parent: null,
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectLabels",
        response: {
          data: {
            projectLabels: {
              nodes: [
                {
                  id: "plabel-1",
                  name: "Customer-facing",
                  description: "Visible in roadmap and updates",
                  color: "#5E6AD2",
                  isGroup: false,
                  createdAt: "2026-03-15T10:00:00Z",
                  updatedAt: "2026-03-15T10:00:00Z",
                  archivedAt: null,
                  retiredAt: null,
                  parent: {
                    id: "plabel-root",
                    name: "Product",
                  },
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label List Command - JSON Invalid Limit",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json", "--limit", "0"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})
