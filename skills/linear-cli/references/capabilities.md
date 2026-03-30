# capabilities

> Describe the agent-facing command surface

## Usage

```
Usage:   linear capabilities

Description:

  Describe the agent-facing command surface

Options:

  -h, --help               - Show this help.                           
  -w, --workspace  <slug>  - Target workspace (uses credentials)       
  -j, --json               - Output the capabilities registry as JSON  

Examples:

  Describe agent-facing capabilities as JSON linear capabilities --json                                               
  Find commands that support dry-run         linear capabilities --json | jq '.commands[] | select(.dryRun.supported)'
```
