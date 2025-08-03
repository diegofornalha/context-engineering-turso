# PRP Template: MCP Briefing Tools

## Product Context

[Describe the specific briefing functionality this PRP implements]

## Target User

[Define who will use these specific briefing tools]

## User Stories

1. As a [role], I want to [action] so that [benefit].
2. As a [role], I want to [action] so that [benefit].

## Tool Specifications

### Tool Name: [tool_name]

**Purpose**: [Clear description of what this tool does]

**Input Schema** (Zod):
```typescript
const [ToolName]Schema = z.object({
  // Define all parameters with proper validation
  param1: z.string().min(1).describe("Parameter description"),
  param2: z.number().optional().describe("Optional parameter"),
});
```

**Implementation Requirements**:
- [Requirement 1]
- [Requirement 2]
- [Error handling requirements]
- [Performance requirements]

**Response Format**:
```typescript
// Success case
{
  content: [{
    type: "text",
    text: "Success message or data"
  }]
}

// Error case
{
  content: [{
    type: "text",
    text: "**Error**\n\nError description",
    isError: true
  }]
}
```

## Technical Implementation

### Dependencies Required

```typescript
// List specific imports needed
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
```

### Code Structure

```typescript
// Define the main implementation pattern
export class [FeatureName] {
  constructor(private config: any) {}
  
  async [methodName](params: any): Promise<any> {
    // Implementation details
  }
}
```

## Validation Gates

1. **Input Validation**: Zod schema validates all inputs
2. **Type Safety**: TypeScript strict mode enabled
3. **Error Handling**: All operations wrapped in try/catch
4. **Testing**: Unit tests for core functionality

## Integration Points

- **Data Sources**: [List required data sources]
- **External APIs**: [List API dependencies]
- **Authentication**: [Define auth requirements]

## Performance Considerations

- **Timeouts**: [Define timeout values]
- **Caching**: [Define caching strategy]
- **Concurrency**: [Define concurrent operation limits]

## Security Requirements

- **Authentication**: [Auth requirements]
- **Authorization**: [Permission model]
- **Data Sanitization**: [Input/output sanitization]

## Example Usage

```typescript
// Show a complete example of using this tool
const result = await server.callTool('[tool_name]', {
  param1: "value",
  param2: 123
});
```

## Success Criteria

- [ ] Tool responds within [X] seconds
- [ ] Handles all error cases gracefully
- [ ] Returns properly formatted MCP responses
- [ ] Passes all validation gates