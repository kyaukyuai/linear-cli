import { Command } from "@cliffy/command"
import { Select } from "@cliffy/prompt"
import {
  getDefaultWorkspace,
  getWorkspaces,
  hasWorkspace,
  setDefaultWorkspace,
} from "../../credentials.ts"
import { AuthError, handleError, NotFoundError } from "../../utils/errors.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"

export const defaultCommand = new Command()
  .name("default")
  .description("Set the default workspace")
  .arguments("[workspace:string]")
  .option("-i, --interactive", "Enable interactive workspace selection")
  .action(async ({ interactive }, workspace?: string) => {
    try {
      const workspaces = getWorkspaces()

      if (workspaces.length === 0) {
        throw new AuthError("No workspaces configured", {
          suggestion: "Run `linear auth login` to add a workspace",
        })
      }

      if (workspaces.length === 1) {
        console.log(`Only one workspace configured: ${workspaces[0]}`)
        return
      }

      const currentDefault = getDefaultWorkspace()

      // If no workspace specified, prompt to select one
      if (!workspace) {
        ensureInteractiveInputAvailable(
          { interactive },
          "Workspace is required unless --interactive is used",
          `Pass a workspace name directly, or use --interactive to choose from: ${workspaces.join(", ")}`,
        )
        workspace = await Select.prompt({
          message: "Select default workspace",
          options: workspaces.map((ws) => ({
            name: ws === currentDefault ? `${ws} (current)` : ws,
            value: ws,
          })),
        })
      }

      if (!hasWorkspace(workspace)) {
        throw new NotFoundError("Workspace", workspace, {
          suggestion: `Available workspaces: ${workspaces.join(", ")}`,
        })
      }

      if (workspace === currentDefault) {
        console.log(`"${workspace}" is already the default workspace`)
        return
      }

      await setDefaultWorkspace(workspace)
      console.log(`Default workspace set to: ${workspace}`)
    } catch (error) {
      handleError(error, "Failed to set default workspace")
    }
  })
