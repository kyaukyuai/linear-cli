# workflow-state

> Manage Linear workflow states

## Usage

```
Usage:   linear workflow-state

Description:

  Manage Linear workflow states

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  

Commands:

  list                     - List workflow states for a team
  view  <workflowStateId>  - View a workflow state
```

## Subcommands

### list

> List workflow states for a team

```
Usage:   linear workflow-state list

Description:

  List workflow states for a team

Options:

  -h, --help                  - Show this help.                           
  -w, --workspace  <slug>     - Target workspace (uses credentials)       
  --team           <teamKey>  - Team key (defaults to current team)       
  -j, --json                  - Output as JSON                            
  --no-pager                  - Disable automatic paging for long output
```

### view

> View a workflow state

```
Usage:   linear workflow-state view <workflowStateId>

Description:

  View a workflow state

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  
  -j, --json               - Output as JSON
```
