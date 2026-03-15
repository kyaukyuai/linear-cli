import { snapshotTest } from "@cliffy/testing"
import { addLabelCommand } from "../../../src/commands/project/project-label-add.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Label Add Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await addLabelCommand.parse()
  },
})

await snapshotTest({
  name: "Project Label Add Command - Adds Label",
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
        queryName: "GetProjectLabelsForProject",
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
      {
        queryName: "ProjectAddLabel",
        response: {
          data: {
            projectAddLabel: {
              success: true,
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
      },
    ])

    try {
      await addLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label Add Command - JSON Output",
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
        queryName: "GetProjectLabelsForProject",
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
      {
        queryName: "ProjectAddLabel",
        response: {
          data: {
            projectAddLabel: {
              success: true,
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
      },
    ])

    try {
      await addLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Project Label Add Command - Already Attached",
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
        queryName: "GetProjectLabelsForProject",
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
    ])

    try {
      await addLabelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
