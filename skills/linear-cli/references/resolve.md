# resolve

> Resolve references without mutating Linear

## Usage

```
Usage:   linear resolve

Description:

  Resolve references without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       

Commands:

  issue           [issue]  - Resolve an issue reference without mutating Linear        
  team            [team]   - Resolve a team reference without mutating Linear          
  workflow-state  <state>  - Resolve a workflow state reference without mutating Linear
  user            <user>   - Resolve a user reference without mutating Linear          
  label           <label>  - Resolve an issue label reference without mutating Linear
```

## Subcommands

### issue

> Resolve an issue reference without mutating Linear

```
Usage:   linear resolve issue [issue]

Description:

  Resolve an issue reference without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       
  -j, --json                  - Output as JSON                       

Examples:

  Resolve an explicit issue identifier       linear resolve issue ENG-123 --json
  Resolve the current issue from VCS context linear resolve issue --json
```

### team

> Resolve a team reference without mutating Linear

```
Usage:   linear resolve team [team]

Description:

  Resolve a team reference without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       
  -j, --json                  - Output as JSON                       

Examples:

  Resolve an explicit team key        linear resolve team ENG --json
  Resolve the configured current team linear resolve team --json
```

### workflow-state

> Resolve a workflow state reference without mutating Linear

```
Usage:   linear resolve workflow-state <state>

Description:

  Resolve a workflow state reference without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       
  --team           <team>     - Team key for team-scoped resolution  
  -j, --json                  - Output as JSON                       

Examples:

  Resolve a workflow state by exact name linear resolve workflow-state Done --team ENG --json   
  Resolve a workflow state by type       linear resolve workflow-state started --team ENG --json
```

### user

> Resolve a user reference without mutating Linear

```
Usage:   linear resolve user <user>

Description:

  Resolve a user reference without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       
  -j, --json                  - Output as JSON                       

Examples:

  Resolve the current authenticated user      linear resolve user self --json             
  Resolve a teammate by email or display name linear resolve user alice@example.com --json
```

### label

> Resolve an issue label reference without mutating Linear

```
Usage:   linear resolve label <label>

Description:

  Resolve an issue label reference without mutating Linear

Options:

  -h, --help                  - Show this help.                      
  -w, --workspace  <slug>     - Target workspace (uses credentials)  
  --profile        <profile>  - Execution profile (agent-safe)       
  --team           <team>     - Team key for team-scoped resolution  
  -j, --json                  - Output as JSON                       

Examples:

  Resolve a label within a team context linear resolve label Bug --team ENG --json
```
