import { ValidationError } from "./errors.ts"

export const SOURCE_INTAKE_AUTONOMY_POLICIES = [
  "suggest-only",
  "preview-required",
  "apply-allowed",
] as const

export type SourceIntakeAutonomyPolicy =
  typeof SOURCE_INTAKE_AUTONOMY_POLICIES[number]

export type SourceIntakeAutonomyPolicyContract = {
  family: "source_intake_autonomy_policy"
  version: "v1"
  selected: SourceIntakeAutonomyPolicy
  semantics: {
    requiresDryRun: boolean
    allowsMutation: boolean
    allowsTriageApply: boolean
  }
}

const POLICY_SEMANTICS: Record<
  SourceIntakeAutonomyPolicy,
  SourceIntakeAutonomyPolicyContract["semantics"]
> = {
  "suggest-only": {
    requiresDryRun: true,
    allowsMutation: false,
    allowsTriageApply: false,
  },
  "preview-required": {
    requiresDryRun: true,
    allowsMutation: false,
    allowsTriageApply: true,
  },
  "apply-allowed": {
    requiresDryRun: false,
    allowsMutation: true,
    allowsTriageApply: true,
  },
}

export function buildSourceIntakeAutonomyPolicyContract(
  selected: SourceIntakeAutonomyPolicy,
): SourceIntakeAutonomyPolicyContract {
  return {
    family: "source_intake_autonomy_policy",
    version: "v1",
    selected,
    semantics: POLICY_SEMANTICS[selected],
  }
}

export function resolveSourceIntakeAutonomyPolicy(
  value: string | undefined,
): SourceIntakeAutonomyPolicy {
  if (value == null) {
    return "apply-allowed"
  }

  if (
    SOURCE_INTAKE_AUTONOMY_POLICIES.includes(
      value as SourceIntakeAutonomyPolicy,
    )
  ) {
    return value as SourceIntakeAutonomyPolicy
  }

  throw new ValidationError(
    `Unsupported --autonomy-policy value: ${value}`,
    {
      suggestion:
        "Use --autonomy-policy suggest-only, --autonomy-policy preview-required, or --autonomy-policy apply-allowed.",
    },
  )
}

export function validateSourceIntakeAutonomyPolicy(options: {
  policy: SourceIntakeAutonomyPolicy
  explicit: boolean
  hasContextFile: boolean
  dryRun: boolean
  applyTriage: boolean
}) {
  if (options.explicit && !options.hasContextFile) {
    throw new ValidationError(
      "--autonomy-policy requires --context-file",
      {
        suggestion:
          "Pass --context-file with a normalized external context envelope before selecting a source-intake autonomy policy.",
      },
    )
  }

  if (!options.hasContextFile) {
    return
  }

  if (options.policy === "suggest-only") {
    if (options.applyTriage) {
      throw new ValidationError(
        "--autonomy-policy suggest-only does not allow --apply-triage",
        {
          suggestion:
            "Remove --apply-triage to preview routing suggestions only, or switch to --autonomy-policy preview-required or apply-allowed.",
        },
      )
    }

    if (!options.dryRun) {
      throw new ValidationError(
        "--autonomy-policy suggest-only requires --dry-run",
        {
          suggestion:
            "Add --dry-run to inspect source-intake suggestions without mutating Linear, or switch to --autonomy-policy apply-allowed when you are ready to apply.",
        },
      )
    }
  }

  if (options.policy === "preview-required" && !options.dryRun) {
    throw new ValidationError(
      "--autonomy-policy preview-required requires --dry-run",
      {
        suggestion:
          "Run the source-intake flow with --dry-run first, then rerun with --autonomy-policy apply-allowed when you are ready to mutate Linear.",
      },
    )
  }
}
