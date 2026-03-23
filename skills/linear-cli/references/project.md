# project

> Manage Linear projects

## Usage

```
Usage:   linear project

Description:

  Manage Linear projects

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  

Commands:

  list                        - List projects                     
  view, v  <projectIdOrSlug>  - View project details              
  create                      - Create a new Linear project       
  update   <projectId>        - Update a Linear project           
  delete   <projectId>        - Delete (trash) a Linear project   
  label                       - Manage project labels on a project
```

## Subcommands

### list

> List projects

```
Usage:   linear project list

Description:

  List projects

Options:

  -h, --help                 - Show this help.                           
  -w, --workspace  <slug>    - Target workspace (uses credentials)       
  --team           <team>    - Filter by team key                        
  --all-teams                - Show projects from all teams              
  --status         <status>  - Filter by status name                     
  -w, --web                  - Open in web browser                       
  -a, --app                  - Open in Linear.app                        
  -j, --json                 - Output as JSON                            
  --no-pager                 - Disable automatic paging for long output
```

### view

> View project details

```
Usage:   linear project view <projectIdOrSlug>

Description:

  View project details

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  
  -w, --web                - Open in web browser                  
  -a, --app                - Open in Linear.app                   
  -j, --json               - Output as JSON
```

### create

> Create a new Linear project

```
Usage:   linear project create

Description:

  Create a new Linear project

Options:

  -h, --help                        - Show this help.                                                          
  -w, --workspace    <slug>         - Target workspace (uses credentials)                                      
  -n, --name         <name>         - Project name (required)                                                  
  -d, --description  <description>  - Project description                                                      
  -t, --team         <team>         - Team key (required, can be repeated for multiple teams)                  
  -l, --lead         <lead>         - Project lead (username, email, or @me)                                   
  -s, --status       <status>       - Project status (planned, started, paused, completed, canceled, backlog)  
  --start-date       <startDate>    - Start date (YYYY-MM-DD)                                                  
  --target-date      <targetDate>   - Target completion date (YYYY-MM-DD)                                      
  --initiative       <initiative>   - Add to initiative immediately (ID, slug, or name)                        
  -i, --interactive                 - Interactive mode (default if no flags provided)                          
  -j, --json                        - Output created project as JSON                                           
  --dry-run                         - Preview the project without creating it
```

### update

> Update a Linear project

```
Usage:   linear project update <projectId>

Description:

  Update a Linear project

Options:

  -h, --help                        - Show this help.                                                  
  -w, --workspace    <slug>         - Target workspace (uses credentials)                              
  -n, --name         <name>         - Project name                                                     
  -d, --description  <description>  - Project description                                              
  -s, --status       <status>       - Status (planned, started, paused, completed, canceled, backlog)  
  -l, --lead         <lead>         - Project lead (username, email, or @me)                           
  --start-date       <startDate>    - Start date (YYYY-MM-DD)                                          
  --target-date      <targetDate>   - Target date (YYYY-MM-DD)                                         
  -t, --team         <team>         - Team key (can be repeated for multiple teams)                    
  --dry-run                         - Preview the update without mutating the project
```

### delete

> Delete (trash) a Linear project

```
Usage:   linear project delete <projectId>

Description:

  Delete (trash) a Linear project

Options:

  -h, --help               - Show this help.                                    
  -w, --workspace  <slug>  - Target workspace (uses credentials)                
  -f, --force              - Skip confirmation prompt                           
  --dry-run                - Preview the deletion without mutating the project
```

### label

> Manage project labels on a project

```
Usage:   linear project label

Description:

  Manage project labels on a project

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  

Commands:

  add     <projectId> <label>  - Add a label to a project     
  remove  <projectId> <label>  - Remove a label from a project
```

#### label subcommands

##### add

```
Usage:   linear project label add <projectId> <label>

Description:

  Add a label to a project

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  
  -j, --json               - Output as JSON                       

Examples:

  Add a project label linear project label add auth-redesign bug
```

##### remove

```
Usage:   linear project label remove <projectId> <label>

Description:

  Remove a label from a project

Options:

  -h, --help               - Show this help.                      
  -w, --workspace  <slug>  - Target workspace (uses credentials)  
  -j, --json               - Output as JSON                       

Examples:

  Remove a project label linear project label remove auth-redesign bug
```
