# Linear CLI Command Reference

## Commands

- [auth](./auth.md) - Manage Linear authentication
- [issue](./issue.md) - Manage Linear issues
- [team](./team.md) - Manage Linear teams
- [project](./project.md) - Manage Linear projects
- [project-update](./project-update.md) - Manage project status updates
- [cycle](./cycle.md) - Manage Linear team cycles
- [milestone](./milestone.md) - Manage Linear project milestones
- [initiative](./initiative.md) - Manage Linear initiatives
- [initiative-update](./initiative-update.md) - Manage initiative status updates (timeline posts)
- [label](./label.md) - Manage Linear issue labels
- [document](./document.md) - Manage Linear documents
- [notification](./notification.md) - Manage Linear notifications
- [webhook](./webhook.md) - Manage Linear webhooks
- [workflow-state](./workflow-state.md) - Manage Linear workflow states
- [user](./user.md) - Manage Linear users
- [project-label](./project-label.md) - Manage Linear project labels
- [config](./config.md) - Interactively generate .linear.toml configuration
- [schema](./schema.md) - Print the GraphQL schema to stdout
- [api](./api.md) - Make a raw GraphQL API request
- [capabilities](./capabilities.md) - Describe the agent-facing command surface
- [resolve](./resolve.md) - Resolve references without mutating Linear

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
