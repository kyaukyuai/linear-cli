# Stdin And Pipeline Policy

`linear-cli` accepts piped stdin for commands where the primary input is free-form text or a bulk identifier stream.

## When To Use Stdin

- Use flags for short scalar values such as `--title`, `--state`, or `--priority`.
- Use `--description-file`, `--body-file`, or `--content-file` when the content already exists on disk.
- Use stdin when another command is generating the content and you want to avoid temporary files.

## Current Stdin-Capable Commands

### Implicit Text Input

These commands read stdin when input is piped and no explicit text flag/file flag is provided:

- `linear api`
- `linear document create`
- `linear document update`
- `linear project-update create`
- `linear initiative-update create`
- `linear issue create`
- `linear issue update`
- `linear issue comment add`
- `linear issue comment update`

### Explicit Bulk Input

These commands read identifiers from stdin only when `--bulk-stdin` is passed:

- `linear issue delete --bulk-stdin`
- `linear document delete --bulk-stdin`
- `linear initiative archive --bulk-stdin`
- `linear initiative delete --bulk-stdin`

## Non-TTY Rules

- Commands must never hang forever waiting for stdin when the process is running without a TTY.
- Empty stdin is treated as absent input.
- Non-TTY commands must fail fast with guidance instead of falling back to an interactive prompt.
- Explicit flags and file-based inputs always take precedence over piped stdin.

## Recommended Patterns

```bash
cat description.md | linear issue create --title "Fix auth expiry" --team ENG
cat description.md | linear issue update ENG-123 --state started --dry-run --json
printf "Ready for review\n" | linear issue comment add ENG-123
printf "Reworded comment\n" | linear issue comment update comment_123
cat spec.md | linear document create --title "Spec"
echo '{ viewer { id } }' | linear api
```
