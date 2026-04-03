# Linear CLI Command Reference

## Commands

{{COMMANDS_LIST}}

## Quick Reference

```bash
# Discover agent-facing capabilities
linear capabilities
linear capabilities --compat v2

# Get help for any command
linear <command> --help
linear <command> <subcommand> --help
```

## Agent Workflow

Use the CLI in this order when possible:

1. Discover command traits with `linear capabilities`, then opt into `--compat v2` when richer schema metadata is needed
2. Read state with default-JSON core surfaces or `--json`
3. Preview writes with `--dry-run --json`
4. Apply writes with `--json`
5. Inspect exit codes and `error.details` for retries or reconciliation

Use `--interactive` only for human/debug prompt flows. Agent-controlled runs should pass explicit flags, stdin, or file inputs.
