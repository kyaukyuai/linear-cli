import { ValidationError } from "./errors.ts"

export type ExecutionProfile = "agent-safe" | "human-debug"

export const AGENT_SAFE_PROFILE = "agent-safe" satisfies ExecutionProfile
export const HUMAN_DEBUG_PROFILE = "human-debug" satisfies ExecutionProfile
export const AGENT_SAFE_WRITE_TIMEOUT_MS = 45_000
export const DEFAULT_EXECUTION_PROFILE = AGENT_SAFE_PROFILE

let cliExecutionProfile: ExecutionProfile | undefined

export function parseExecutionProfile(
  profile: string | undefined,
): ExecutionProfile | undefined {
  if (profile == null) {
    return undefined
  }

  if (profile === AGENT_SAFE_PROFILE || profile === HUMAN_DEBUG_PROFILE) {
    return profile
  }

  throw new ValidationError(
    `Unsupported execution profile: ${profile}`,
    {
      suggestion: "Use --profile agent-safe or --profile human-debug.",
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

export function getEffectiveExecutionProfile(): ExecutionProfile {
  return cliExecutionProfile ?? DEFAULT_EXECUTION_PROFILE
}

export function isAgentSafeExecutionProfile(): boolean {
  return getEffectiveExecutionProfile() === AGENT_SAFE_PROFILE
}

export function shouldDisablePagerByDefault(): boolean {
  return getEffectiveExecutionProfile() !== HUMAN_DEBUG_PROFILE
}

export function shouldAllowInteractivePrompts(): boolean {
  return getEffectiveExecutionProfile() === HUMAN_DEBUG_PROFILE
}
