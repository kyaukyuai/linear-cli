# user

> Manage Linear users

## Usage

```
Usage:   linear user

Description:

  Manage Linear users

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  

Commands:

  list            - List users in the workspace
  view  <userId>  - View a user
```

## Subcommands

### list

> List users in the workspace

```
Usage:   linear user list

Description:

  List users in the workspace

Options:

  -h, --help                - Show this help.                                        
  -w, --workspace  <slug>   - Target workspace (uses credentials)                    
  -n, --limit      <limit>  - Maximum number of users                   (Default: 50)
  -a, --all                 - Include disabled users                                 
  -j, --json                - Output as JSON                                         
  --no-pager                - Disable automatic paging for long output
```

### view

> View a user

```
Usage:   linear user view <userId>

Description:

  View a user

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  
  -j, --json               - Output as JSON
```
