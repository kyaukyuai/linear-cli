import { assertEquals, assertThrows } from "@std/assert"
import { ValidationError } from "../../src/utils/errors.ts"
import {
  buildSourceIntakeAutonomyPolicyContract,
  resolveSourceIntakeAutonomyPolicy,
  validateSourceIntakeAutonomyPolicy,
} from "../../src/utils/source_intake_policy.ts"

Deno.test("resolveSourceIntakeAutonomyPolicy defaults to apply-allowed", () => {
  assertEquals(resolveSourceIntakeAutonomyPolicy(undefined), "apply-allowed")
  assertEquals(
    resolveSourceIntakeAutonomyPolicy("suggest-only"),
    "suggest-only",
  )
})

Deno.test("buildSourceIntakeAutonomyPolicyContract returns deterministic semantics", () => {
  assertEquals(
    buildSourceIntakeAutonomyPolicyContract("preview-required"),
    {
      family: "source_intake_autonomy_policy",
      version: "v1",
      selected: "preview-required",
      semantics: {
        requiresDryRun: true,
        allowsMutation: false,
        allowsTriageApply: true,
      },
    },
  )
})

Deno.test("resolveSourceIntakeAutonomyPolicy rejects unknown values", () => {
  assertThrows(
    () => resolveSourceIntakeAutonomyPolicy("free-run"),
    ValidationError,
    "Unsupported --autonomy-policy value",
  )
})

Deno.test("validateSourceIntakeAutonomyPolicy rejects suggest-only without dry-run", () => {
  assertThrows(
    () =>
      validateSourceIntakeAutonomyPolicy({
        policy: "suggest-only",
        explicit: true,
        hasContextFile: true,
        dryRun: false,
        applyTriage: false,
      }),
    ValidationError,
    "--autonomy-policy suggest-only requires --dry-run",
  )
})

Deno.test("validateSourceIntakeAutonomyPolicy rejects suggest-only with apply-triage", () => {
  assertThrows(
    () =>
      validateSourceIntakeAutonomyPolicy({
        policy: "suggest-only",
        explicit: true,
        hasContextFile: true,
        dryRun: true,
        applyTriage: true,
      }),
    ValidationError,
    "--autonomy-policy suggest-only does not allow --apply-triage",
  )
})

Deno.test("validateSourceIntakeAutonomyPolicy rejects preview-required without dry-run", () => {
  assertThrows(
    () =>
      validateSourceIntakeAutonomyPolicy({
        policy: "preview-required",
        explicit: true,
        hasContextFile: true,
        dryRun: false,
        applyTriage: true,
      }),
    ValidationError,
    "--autonomy-policy preview-required requires --dry-run",
  )
})
