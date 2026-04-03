import { ValidationError } from "./errors.ts"

export type ExecutionProfile = "agent-safe"

export const AGENT_SAFE_PROFILE = "agent-safe" satisfies ExecutionProfile
export const AGENT_SAFE_WRITE_TIMEOUT_MS = 45_000

let cliExecutionProfile: ExecutionProfile | undefined

export function parseExecutionProfile(
  profile: string | undefined,
): ExecutionProfile | undefined {
  if (profile == null) {
    return undefined
  }

  if (profile === AGENT_SAFE_PROFILE) {
    return profile
  }

  throw new ValidationError(
    `Unsupported execution profile: ${profile}`,
    {
      suggestion: "Use --profile agent-safe.",
    },
  )
}

export function setCliExecutionProfile(
  profile: ExecutionProfile | undefined,
): void {
  cliExecutionProfile = profile
}

export function getCliExecutionProfile(): ExecutionProfile | undefined {
  return cliExecutionProfile
}

export function isAgentSafeExecutionProfile(): boolean {
  return cliExecutionProfile === AGENT_SAFE_PROFILE
}

export function shouldDisablePagerByDefault(): boolean {
  return isAgentSafeExecutionProfile()
}

export function shouldAllowInteractivePrompts(): boolean {
  return !isAgentSafeExecutionProfile()
}
