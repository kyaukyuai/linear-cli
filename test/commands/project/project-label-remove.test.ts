import { snapshotTest } from "@cliffy/testing"
import { removeLabelCommand } from "../../../src/commands/project/project-label-remove.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Label Remove Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await removeLabelCommand.parse()
  },
})

await snapshotTest({
  name: "Project Label Remove Command - Removes Label",
  meta: import.meta,
  colors: false,
  args: ["auth-redesign", "Customer-facing"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-1", slugId: "auth-redesign" }],
            },
          },
        },
      },
      {
        queryName: "SearchProjectLabelsByName",
        response: {
          data: {
            projectLabels: {
              nodes: [{
                id: "plabel-1",
                name: "Customer-facing",
                description: "Visible in roadmap and updates",
                color: "#5E6AD2",
                isGroup: false,
                archivedAt: null,
                retiredAt: null,
                parent: null,
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectLabelsForProjectRemove",
        response: {
          data: {
            project: {
              id: "project-1",
              name: "Auth Redesign",
              slugId: "auth-redesign",
              labels: {
                nodes: [{
                  id: "plabel-1",
                  name: "Customer-facing",
                }],
              },
            },
          },
        },
      },
      {
        queryName: "ProjectRemoveLabel",
        response: {
          data: {
            projectRemoveLabel: {
              success: true,
              project: {
                id: "project-1",
                name: "Auth Redesign",
                slugId: "auth-redesign",
                labels: {
                  nodes: [],
                },
              },
            },
          },
        },
      },
    ])

    try {
      await removeLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label Remove Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["auth-redesign", "Customer-facing", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-1", slugId: "auth-redesign" }],
            },
          },
        },
      },
      {
        queryName: "SearchProjectLabelsByName",
        response: {
          data: {
            projectLabels: {
              nodes: [{
                id: "plabel-1",
                name: "Customer-facing",
                description: "Visible in roadmap and updates",
                color: "#5E6AD2",
                isGroup: false,
                archivedAt: null,
                retiredAt: null,
                parent: null,
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectLabelsForProjectRemove",
        response: {
          data: {
            project: {
              id: "project-1",
              name: "Auth Redesign",
              slugId: "auth-redesign",
              labels: {
                nodes: [{
                  id: "plabel-1",
                  name: "Customer-facing",
                }],
              },
            },
          },
        },
      },
      {
        queryName: "ProjectRemoveLabel",
        response: {
          data: {
            projectRemoveLabel: {
              success: true,
              project: {
                id: "project-1",
                name: "Auth Redesign",
                slugId: "auth-redesign",
                labels: {
                  nodes: [],
                },
              },
            },
          },
        },
      },
    ])

    try {
      await removeLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label Remove Command - Not Attached",
  meta: import.meta,
  colors: false,
  args: ["auth-redesign", "Customer-facing"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-1", slugId: "auth-redesign" }],
            },
          },
        },
      },
      {
        queryName: "SearchProjectLabelsByName",
        response: {
          data: {
            projectLabels: {
              nodes: [{
                id: "plabel-1",
                name: "Customer-facing",
                description: null,
                color: "#5E6AD2",
                isGroup: false,
                archivedAt: null,
                retiredAt: null,
                parent: null,
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectLabelsForProjectRemove",
        response: {
          data: {
            project: {
              id: "project-1",
              name: "Auth Redesign",
              slugId: "auth-redesign",
              labels: {
                nodes: [],
              },
            },
          },
        },
      },
    ])

    try {
      await removeLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
