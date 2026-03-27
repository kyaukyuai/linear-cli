export const USE_YES_SUGGESTION = "Use --yes to skip confirmation."

export type ConfirmationBypassOptions = {
  yes?: boolean
  force?: boolean
  confirm?: boolean
}

export function shouldSkipConfirmation(
  options: ConfirmationBypassOptions,
): boolean {
  return options.yes === true || options.force === true ||
    options.confirm === true
}
