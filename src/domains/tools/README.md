# Tools Domain

Handles tool CRUD and phase management.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `createTool()`, `updateTool()`, `deleteTool()` | Tool CRUD |
| `phase.service.ts` | `setPhase()`, `promoteToProduction()` | Phase management |

## Tool Phases

1. **Sandbox** - Development/testing
2. **Production** - Live for users

## Database Tables

- `tools` - Tool registry
- `api_keys` - Tool API keys

## Rules

1. Tools must start in sandbox phase
2. Production promotion requires review
3. API keys are tool-scoped
