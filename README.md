# linear-cli

`linear-cli` is an agent-first Linear CLI for Claude Code, Codex, and other automation that needs a stable command surface instead of screen scraping or ad-hoc GraphQL scripts. this fork of [`schpet/linear-cli`](https://github.com/schpet/linear-cli) keeps the git and [jj](https://www.jj-vcs.dev/) workflow ergonomics from upstream, then adds stable JSON contracts, dry-run previews, retry-safe error semantics, and pipeline-friendly command behavior for automation-heavy teams.

if you want an agent to read Linear state, preview a write, apply it, and return structured output without leaving the shell, this repo is designed for that path first.

```bash
linear capabilities --json
linear issue list --json
linear issue view ENG-123 --json
linear issue create -t "Backfill webhook contract docs" --team ENG --dry-run --json
linear issue update ENG-123 --state done --comment "Shipped in v2.10.0" --json
linear project view "Automation Contract v3" --json
linear notification list --json
```

interactive commands still exist for humans, but the primary design goal is that an agent can discover commands incrementally, pass all important input as flags or stdin, and get machine-readable success or failure back.

## screencast demos

<details>
<summary><code>linear issue create</code></summary>

<img width="600" src="docs/cast-issue-create.svg?1" alt="screencast showing the linear issue create command, interactively adding issue details">

</details>

<details>
<summary><code>linear issue start</code></summary>

<img width="600" src="docs/cast-issue-start.svg?1" alt="screencast showing the linear issue start command, interactively choosing an issue to start">

</details>

## install

for agents and scripts, prefer a pinned install in the repo or runtime you control.

### npm / bun / pnpm

install as a dependency to pin a version in your project:

```bash
npm install -D @kyaukyuai/linear-cli
# or
bun add -D @kyaukyuai/linear-cli
# or
pnpm add -D @kyaukyuai/linear-cli
```

then run via your package manager:

```bash
npx linear issue list
bunx linear issue list
```

> **note:** this package ships pre-built binaries

package on npm: [@kyaukyuai/linear-cli](https://www.npmjs.com/package/@kyaukyuai/linear-cli)

### deno via jsr

```bash
deno install -A --reload -f -g -n linear jsr:@kyaukyuai/linear-cli
```

### homebrew

```bash
brew install kyaukyuai/tap/linear
```

### binaries

https://github.com/kyaukyuai/linear-cli/releases/latest

### local dev

```bash
git clone https://github.com/kyaukyuai/linear-cli
cd linear-cli
deno task install
```

## agent-facing capabilities

compared to upstream, this fork adds and maintains capabilities aimed at automation-heavy workflows:

- stable JSON contracts for the automation tier, with machine-readable failures for parser, validation, and runtime errors
- a self-describing `linear capabilities --json` surface so agents can discover contract coverage and command traits without scraping docs
- `--dry-run` previews for high-value write commands, including `issue start`, issue writes, and non-issue writes
- stdin and pipeline support for high-value write paths
- retry-safe semantics for relation add/delete, project label add/remove, notification read/archive, and structured partial-failure details
- canonical `--yes` confirmation bypass handling for destructive commands
- agent-focused help examples across automation-tier and major write commands
- cycle workflows beyond listing and viewing, including `cycle current`, `cycle next`, `cycle create`, `cycle add`, and `cycle remove`
- issue workflow commands for `search`, `assign`, `move`, `priority`, `estimate`, `label add/remove`, comment delete, relations, and attachments
- inbox notification commands for `list`, `count`, `read`, and `archive`
- webhook commands for `list`, `view`, `create`, `update`, and `delete`
- workflow state commands for `list` and `view`
- user commands for `list` and `view`
- project label commands for `list` and `project label add/remove`
- JSON output for scripting across issue, cycle, project, milestone, document, webhook, and notification commands
- workspace-aware auth management with keyring migration and default workspace support
- generated AI-agent skill docs, Claude plugin metadata, npm publishing, and Homebrew tap release plumbing

## automation contract

for bot and org-wide automation use cases, `linear-cli` defines a stable JSON contract for a focused automation tier.

to discover the curated agent-facing command surface programmatically, use `linear capabilities --json`. it reports stable contract versions, automation-tier membership, and per-command support for `--json`, `--dry-run`, stdin, confirmation bypass, and idempotency category.

- v1 in scope: `issue list/view/create/update --json`, `issue relation add/delete/list --json`, `issue comment add --json`, `team members --json`, `issue parent/children/create-batch --json`
- v2 additions: `project list/view --json`, `cycle list/view/current/next --json`, `milestone list/view --json`
- v3 additions: `document list/view --json`, `webhook list/view --json`, `notification list/count --json`
- out of scope: non-JSON terminal output, `linear api`, and other `--json` commands that are not listed above

the contract fixes top-level success payload shapes and requires machine-readable failure payloads for the automation tier. see [docs/json-contracts.md](docs/json-contracts.md) for the full contract, compatibility rules, and example payloads. that guarantee also covers parser and argument validation failures when `--json` is present.

for automation consumers, auth and authorization failures now use exit code `4`, while free-plan or workspace-plan limit failures use exit code `5`. other contract failures remain non-zero and currently use `1`. rate-limited responses remain on exit code `1`, but now include retry guidance and, when available, `error.details.rateLimit` metadata.

the same document also defines the shared preview contract for future `--dry-run` write commands. those commands are not all implemented yet, but the contract now fixes the expected `stdout`, `exit code`, and `--json --dry-run` envelope shape ahead of rollout.

destructive commands use `--yes` as the canonical confirmation-bypass flag. legacy `--force` and `--confirm` flags are still accepted where older workflows already depended on them.

for retry behavior, prefer treating write commands in three buckets:

- retry-safe set-style writes: `issue update` without `--comment`, plus relation add/delete
- retry-safe no-op writes: `project label add/remove` and `notification read/archive`, which succeed without mutating when the target state is already satisfied
- non-idempotent writes: `issue create`, `issue comment add`, and `issue update --comment`
- resumable but non-idempotent batch writes: `issue create-batch`, which reports `error.details.createdIdentifiers` and `failedStep` on partial failure

when a write command completes part of its work and then fails, `error.details` uses a shared partial-success shape with `failureStage`, `retryable`, and `partialSuccess`. for example, `issue update --comment --json` sets `error.details.partialSuccess.issueUpdated = true` and includes a standalone retry command for `issue comment add`.

For stdin and pipeline behavior, see [docs/stdin-policy.md](docs/stdin-policy.md).

## differences from upstream

this fork is intentionally diverging from upstream in a few ways:

- package and publishing identity use `kyaukyuai/linear-cli`, `@kyaukyuai/linear-cli`, and `kyaukyuai/tap/linear`
- maintainer workflows are standardized around git-based release automation, even though the CLI itself still supports both git and jj at runtime
- documentation and release assets are tailored for this fork's roadmap, including agent-facing docs and additional release infrastructure
- changelog and README content track fork-specific features separately from upstream history

## setup

1. create an API key at [linear.app/settings/account/security](https://linear.app/settings/account/security)[^1]

2. authenticate with the CLI:

   ```sh
   linear auth login
   ```

3. configure your project:

   ```sh
   cd my-project-repo
   linear config
   ```

see [docs/authentication.md](docs/authentication.md) for multi-workspace support and other authentication options.

the CLI works with both git and jj version control systems:

- **git**: works best when your branches include Linear issue IDs (e.g. `eng-123-my-feature`). use `linear issue start` or linear UI's 'copy git branch name' button and [related automations](https://linear.app/docs/account-preferences#git-related-automations).
- **jj**: detects issues from `Linear-issue` trailers in your commit descriptions. use `linear issue start` to automatically add the trailer, or add it manually with `jj describe`, e.g. `jj describe "$(linear issue describe ABC-123)"`

## commands

### issue commands

the current issue is determined by:

- **git**: the issue id in the current branch name (e.g. `eng-123-my-feature`)
- **jj**: the `Linear-issue` trailer in the current or ancestor commits

note that [Linear's GitHub integration](https://linear.app/docs/github#branch-format) will suggest git branch names.

```bash
linear issue view      # view current issue details in terminal
linear issue view ABC-123
linear issue view 123
linear issue view ABC-123 --json            # emit stable machine-readable issue details
linear issue view ABC-123 --json --no-comments  # skip raw comments but keep commentsSummary
linear issue view -w   # open issue in web browser
linear issue view -a   # open issue in Linear.app
linear issue id        # prints the issue id from current branch (e.g., "ENG-123")
linear issue title     # prints just the issue title
linear issue url       # prints the Linear.app URL for the issue
linear issue pr        # creates a GitHub PR with issue details via `gh pr create`
linear issue list      # list issues assigned to you in a table view (supports -s/--state and --sort)
linear issue list --all --json  # list all issues across states and assignees without a limit
linear issue list --all-states  # still defaults to your issues; use -A to include others
linear issue list -s todo  # alias for unstarted
linear issue list --project "My Project" --milestone "Phase 1"  # filter by milestone
linear issue list --json  # emit machine-readable issue data
linear issue list --all-states --query auth --priority high --updated-before 2026-03-31T00:00:00Z --due-before 2026-04-07 --json
linear issue list --parent ENG-100 --json  # filter sub-issues of a parent issue
linear issue list -w   # open issue list in web browser
linear issue list -a   # open issue list in Linear.app
linear issue start     # create/switch to issue branch and mark as started
linear issue start ENG-123 --dry-run  # preview the branch and target state
linear issue create    # create a new issue (interactive prompts)
linear issue create -t "title" -d "description"  # create with flags
cat description.md | linear issue create -t "title" --team ENG  # read description from stdin
linear issue create -t "title" --team ENG --json  # emit machine-readable created issue data
linear issue create -t "title" --team ENG --dry-run --json  # preview the created issue payload
linear issue create-batch --file ./issue-batch.json --json  # create a parent issue and child issues from JSON
linear issue create-batch --file ./issue-batch.json --dry-run --json  # preview a batch without creating issues
linear issue create --project "My Project" --milestone "Phase 1"  # create with milestone
linear issue update    # update an issue (interactive prompts)
cat description.md | linear issue update ENG-123 --state started  # read description from stdin
linear issue update ENG-123 --due-date 2026-03-31  # set an issue due date
linear issue update ENG-123 --clear-due-date       # clear an issue due date
linear issue update ENG-123 --assignee self --json  # emit machine-readable updated issue data
linear issue update ENG-123 --state started --comment "Work has started"  # update and comment in one command
linear issue update ENG-123 --state started --comment "Work has started" --dry-run  # preview issue updates
linear issue update ENG-123 --milestone "Phase 2"  # set milestone on existing issue
linear issue delete    # delete an issue
linear issue comment list          # list comments on current issue
linear issue comment add           # add a comment to current issue
linear issue comment add ENG-123 "follow-up"  # add a comment with positional body
printf "follow-up\n" | linear issue comment add ENG-123  # read comment body from stdin
linear issue comment add -p <id>   # reply to a specific comment
linear issue comment add ENG-123 --body "follow-up" --json  # emit created comment data
linear issue comment add ENG-123 --body "follow-up" --dry-run --json  # preview comment creation
linear issue relation add ENG-123 blocked-by ENG-100 --json  # emit machine-readable relation creation data
linear issue relation add ENG-123 blocked-by ENG-100 --dry-run --json  # preview relation creation
linear issue relation delete ENG-123 blocked-by ENG-100 --json  # emit machine-readable relation deletion data
linear issue relation delete ENG-123 blocked-by ENG-100 --dry-run --json  # preview relation deletion
linear issue relation list ENG-123 --json  # emit dependency graph for an issue
linear issue comment update <id>   # update a comment
printf "reworded comment\n" | linear issue comment update <id>  # read updated body from stdin
linear issue commits               # show all commits for an issue (jj only)
linear issue parent ENG-123 --json    # emit the parent issue, or null when absent
linear issue children ENG-123 --json  # emit child issues for decomposition workflows
```

For short inline text, `-d/--description` is fine. For Markdown content, prefer `--description-file <path>` or pipe content on stdin to avoid shell escaping issues.

`issue create-batch` expects a JSON file shaped like:

```json
{
  "team": "ENG",
  "project": "Roadmap",
  "parent": {
    "title": "Manager bot rollout",
    "description": "Coordinate rollout work",
    "state": "started"
  },
  "children": [
    { "title": "Add issue list JSON", "assignee": "self" },
    { "title": "Add issue view JSON", "dueDate": "2026-04-15" }
  ]
}
```

`issue create-batch` creates the parent first and then creates each child in order. If a later child fails, already created issues are not rolled back. Use `--dry-run --json` to preview the plan first. In `--json` mode, partial failures include `error.details.createdIdentifiers` and `error.details.failedStep` so automation can resume from the remaining work instead of rerunning the same batch unchanged.

### team commands

```bash
linear team list       # list teams
linear team list --json  # emit contract-stable team summaries
linear team view ENG --json  # emit contract-stable team details
linear team id         # print out the team id (e.g. for scripts)
linear team members    # list team members
linear team members ENG --json  # emit assignable candidates for a team
linear team create     # create a new team
linear team autolinks  # configure GitHub repository autolinks for Linear issues
```

### cycle commands

```bash
linear cycle list --team ENG
linear cycle list --team ENG --json  # emit cycle summaries for automation
linear cycle view "Sprint 42" --team ENG --json  # emit detailed cycle payload
linear cycle current --team ENG --json  # emit active cycle or null
linear cycle next --team ENG --json  # emit next cycle or null
```

### project commands

```bash
linear project list    # list projects
linear project list --json  # emit contract-stable project summaries
linear project view <projectIdOrSlug>    # view project details
linear project view <projectIdOrSlug> --json  # emit contract-stable project details
linear project create --name "Platform Refresh" --team ENG --dry-run --json  # preview a project create
linear project update <projectIdOrSlug> --name "Platform Refresh" --dry-run  # preview a project update
linear project delete <projectIdOrSlug> --dry-run  # preview a project deletion
linear project label add <projectIdOrSlug> <labelNameOrId>     # attach a project label
linear project label remove <projectIdOrSlug> <labelNameOrId>  # detach a project label
```

### milestone commands

```bash
linear milestone list --project <projectId>     # list milestones for a project
linear milestone list --project <projectId> --json  # emit contract-stable milestone summaries
linear m list --project <projectId>             # list milestones (alias)
linear milestone view <milestoneId>             # view milestone details
linear milestone view <milestoneId> --json      # emit contract-stable milestone details
linear m view <milestoneId>                     # view milestone (alias)
linear milestone create --project <projectId> --name "Q1 Goals" --target-date "2026-03-31"  # create a milestone
linear milestone create --project <projectId> --name "Q1 Goals" --dry-run   # preview a milestone create
linear m create --project <projectId>           # create a milestone (interactive)
linear milestone update <milestoneId> --name "New Name"  # update milestone name
linear milestone update <milestoneId> --name "New Name" --dry-run           # preview a milestone update
linear m update <milestoneId> --target-date "2026-04-15"  # update target date
linear milestone delete <milestoneId>           # delete a milestone
linear milestone delete <milestoneId> --dry-run                                # preview a milestone delete
linear m delete <milestoneId> --yes             # delete without confirmation
```

### document commands

manage Linear documents from the command line. documents can be attached to projects or issues, or exist at the workspace level.

```bash
# list documents
linear document list                            # list all accessible documents
linear docs list                                # alias for document
linear document list --project <projectId>      # filter by project
linear document list --issue TC-123             # filter by issue
linear document list --json                     # output as JSON

# view a document
linear document view <slug>                     # view document rendered in terminal
linear document view <slug> --raw               # output raw markdown (for piping)
linear document view <slug> --web               # open in browser
linear document view <slug> --json              # output as JSON

# create a document
linear document create --title "My Doc" --content "# Hello"           # inline content
linear document create --title "Spec" --content-file ./spec.md        # from file
linear document create --title "Doc" --project <projectId>            # attach to project
linear document create --title "Notes" --issue TC-123                 # attach to issue
linear document create --title "Spec" --content "# Draft" --dry-run   # preview a document create
cat spec.md | linear document create --title "Spec"                   # from stdin

# update a document
linear document update <slug> --title "New Title"                     # update title
linear document update <slug> --content-file ./updated.md             # update content
linear document update <slug> --edit                                  # open in $EDITOR
linear document update <slug> --title "New Title" --dry-run           # preview a document update

# delete a document
linear document delete <slug>                   # soft delete (move to trash)
linear document delete <slug> --permanent       # permanent delete
linear document delete --bulk <slug1> <slug2>   # bulk delete
linear document delete <slug> --dry-run         # preview a document delete
```

### notification commands

manage your Linear inbox from the command line with a primitive GraphQL-aligned surface.

```bash
linear notification list                  # list recent notifications
linear notification list --unread         # show only unread notifications
linear notification count                 # show unread notification count
linear notification read <notificationId> # mark a notification as read
linear notification archive <notificationId>  # archive a notification
linear notification list --json           # output as JSON
```

### webhook commands

manage Linear webhooks with a primitive GraphQL-aligned surface.

```bash
linear webhook list
linear webhook list --team ENG
linear webhook view <webhookId>
linear webhook create --url https://example.com/linear --resource-types Issue,Comment
linear webhook create --url https://example.com/linear --resource-types Issue,Comment --dry-run --json
linear webhook update <webhookId> --disabled
linear webhook update <webhookId> --disabled --dry-run --json
linear webhook delete <webhookId> --yes
linear webhook delete <webhookId> --dry-run --json
linear webhook list --json
```

### workflow state commands

inspect workflow states directly, without going through issue mutations.

```bash
linear workflow-state list --team ENG
linear workflow-state list --team ENG --json
linear workflow-state view <workflowStateId>
linear workflow-state view <workflowStateId> --json
```

### label commands

inspect issue labels and project labels directly with a primitive GraphQL-aligned surface.

```bash
linear label list
linear label list --team ENG
linear label list --json
linear project-label list
linear project-label list --include-archived
linear project-label list --json
```

### project label commands

inspect workspace project labels directly with a primitive GraphQL-aligned surface.

```bash
linear project-label list
linear project-label list --include-archived
linear project-label list --json
```

### user commands

inspect workspace users directly with a primitive GraphQL-aligned surface.

```bash
linear user list
linear user list --all
linear user list --json  # emit contract-stable user summaries
linear user view <userId>
linear user view <userId> --json  # emit contract-stable user details
```

### other commands

```bash
linear --help          # show all commands
linear --version       # show version
linear config          # setup the project
linear completions     # generate shell completions
```

## configuration options

the CLI supports configuration via environment variables or a `.linear.toml` config file. environment variables take precedence over config file values.

| option          | env var                  | toml key          | example                    | description                           |
| --------------- | ------------------------ | ----------------- | -------------------------- | ------------------------------------- |
| Team ID         | `LINEAR_TEAM_ID`         | `team_id`         | `"ENG"`                    | default team for operations           |
| Workspace       | `LINEAR_WORKSPACE`       | `workspace`       | `"mycompany"`              | workspace slug for web/app URLs       |
| Issue sort      | `LINEAR_ISSUE_SORT`      | `issue_sort`      | `"priority"` or `"manual"` | how to sort issue lists               |
| VCS             | `LINEAR_VCS`             | `vcs`             | `"git"` or `"jj"`          | version control system (default: git) |
| Download images | `LINEAR_DOWNLOAD_IMAGES` | `download_images` | `true` or `false`          | download images when viewing issues   |

the config file can be placed at (checked in order, first found is used):

- `./linear.toml` or `./.linear.toml` (current directory)
- `<repo-root>/linear.toml` or `<repo-root>/.linear.toml` (repository root)
- `<repo-root>/.config/linear.toml`
- `$XDG_CONFIG_HOME/linear/linear.toml` or `~/.config/linear/linear.toml` (Unix)
- `%APPDATA%\linear\linear.toml` (Windows)

## skills

linear-cli includes a skill that helps AI agents use the CLI effectively. for use cases outside the CLI, it includes instructions to interact directly with the graphql api, including authentication.

### claude code

install the skill using [claude code's plugin system](https://code.claude.com/docs/en/skills):

```bash
# from claude code
/plugin marketplace add kyaukyuai/linear-cli
/plugin install linear-cli@linear-cli

# from bash
claude plugin marketplace add kyaukyuai/linear-cli
claude plugin install linear-cli@linear-cli

# to update
claude plugin marketplace update linear-cli
claude plugin update linear-cli@linear-cli
```

### skills.sh for other agents

install the skill using [skills.sh](https://skills.sh):

```bash
npx skills add kyaukyuai/linear-cli
```

view the skill at [skills.sh/kyaukyuai/linear-cli/linear-cli](https://skills.sh/kyaukyuai/linear-cli/linear-cli)

### clawhub publish for maintainers

if you want to publish the generated skill to ClawHub, use the `skills/linear-cli/` directory as the publish target.

> **note:** the CLI is `clawhub`, not `clawdhub`

```bash
cd skills/linear-cli
npx clawhub@latest login
npx clawhub@latest whoami
npx clawhub@latest publish . \
  --slug kyaukyuai-linear-cli \
  --name "Linear CLI" \
  --version 2.1.0 \
  --changelog "Refresh skill docs for linear-cli v2.1.0" \
  --tags latest
```

guidance:

- publish from `skills/linear-cli/`, not the repository root
- keep `--slug kyaukyuai-linear-cli` and `--name "Linear CLI"` stable unless the public skill identity changes
- when the skill matches a CLI release, prefer using the same version as `deno.json` and `CHANGELOG.md`
- if the skill contents changed but no CLI release was cut, bump the skill version independently before publishing
- run `deno task generate-skill-docs` first if command help or skill references changed

the generic `linear-cli` slug is already taken on ClawHub, so this fork publishes as `kyaukyuai-linear-cli`.

## development

### release operations

maintainer release and publish recovery steps are documented in [docs/release-runbook.md](docs/release-runbook.md).

### updating skill documentation

the skill documentation in `skills/linear-cli/` is automatically generated from the CLI help text. after making changes to commands or help text, regenerate the docs:

```bash
deno task generate-skill-docs
```

this will:

- discover all commands and subcommands from `linear --help`
- generate reference documentation for each command
- update the `SKILL.md` file from `SKILL.template.md`

**important:** the CI checks will fail if the generated docs are out of date, so make sure to run this before committing changes that affect command structure or help text.

### code formatting

ensure code is formatted consistently:

```bash
deno fmt
```

the project uses deno's built-in formatter with configuration in `deno.json`. formatting is checked in CI.

## why

linear's UI is incredibly good but it slows me down. i find the following pretty grating to experience frequently:

- switching context from my repo to linear
- not being on the right view when i open linear
- linear suggests a git branch, but i have to do the work of creating or switching to that branch
- linear's suggested git branch doesn't account for it already existing or having a merged pull request

this cli solves this. it knows what you're working on (via git branches or jj commit trailers), does the work of managing your version control state, and will write your pull request details for you.

[^1]: creating an API key requires member access, it is not available for guest accounts.
