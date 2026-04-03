# capabilities

> Describe the agent-facing command surface

## Usage

```
Usage:   linear capabilities

Description:

  Describe the agent-facing command surface

Options:

  -h, --help                  - Show this help.                                                             
  -w, --workspace  <slug>     - Target workspace (uses credentials)                                         
  --profile        <profile>  - Execution profile (agent-safe)                                              
  -j, --json                  - Output the capabilities registry as JSON                                    
  --compat         <version>  - Select the machine-readable capabilities schema version (v1, v2). Requires  
                                --json.                                                                     

Examples:

  Describe agent-facing capabilities as JSON linear capabilities --json                                               
  Request the richer v2 metadata shape       linear capabilities --json --compat v2                                   
  Find commands that support dry-run         linear capabilities --json | jq '.commands[] | select(.dryRun.supported)'
```
