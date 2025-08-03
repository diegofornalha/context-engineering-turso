# PRP: MCP Briefing Server

## Product Context

This PRP defines the implementation of an MCP (Model Context Protocol) server for intelligent briefing generation and management. The server will provide tools for aggregating data from multiple sources, generating comprehensive briefings, creating visualizations, and distributing reports in various formats.

## Target User

Data analysts, executives, project managers, and teams who need automated briefing generation from multiple data sources with rich visualizations and multi-format export capabilities.

## User Stories

1. As an executive, I want to generate monthly performance briefings that aggregate data from GitHub, databases, and APIs so that I can make informed decisions.

2. As a project manager, I want to create weekly project status reports with timeline visualizations and resource utilization metrics automatically.

3. As an incident responder, I want real-time briefings that update as the situation evolves, with clear impact analysis and mitigation tracking.

4. As a strategic planner, I want to generate comprehensive planning documents with market analysis, SWOT assessments, and roadmap visualizations.

5. As a team lead, I want to schedule recurring briefings that are automatically generated and distributed to stakeholders.

## Tool Specifications

### 1. generate_briefing

**Purpose**: Generate a comprehensive briefing based on type and requirements

**Input Schema** (Zod):
```typescript
const GenerateBriefingSchema = z.object({
  type: z.enum(['executive', 'technical', 'project', 'incident', 'strategic']),
  title: z.string().min(1).max(200),
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  sources: z.array(z.object({
    type: z.enum(['github', 'database', 'api', 'metrics', 'file']),
    config: z.record(z.any()),
  })).optional(),
  format: z.enum(['html', 'pdf', 'markdown', 'pptx', 'json']).default('markdown'),
  template: z.string().optional(),
  audience: z.string().optional(),
});
```

**Implementation Requirements**:
- Aggregate data from specified sources
- Apply appropriate template based on briefing type
- Format output according to requested format
- Include visualizations where appropriate
- Return formatted briefing content

### 2. aggregate_data

**Purpose**: Aggregate data from multiple sources for briefing generation

**Input Schema** (Zod):
```typescript
const AggregateDataSchema = z.object({
  sources: z.array(z.object({
    type: z.enum(['github', 'database', 'api', 'metrics', 'file']),
    name: z.string(),
    config: z.record(z.any()),
  })),
  filters: z.record(z.any()).optional(),
  cache: z.boolean().default(true),
});
```

**Implementation Requirements**:
- Fetch data concurrently from all sources
- Normalize data to common format
- Apply filters if provided
- Cache results if enabled
- Handle errors gracefully per source

### 3. create_visualization

**Purpose**: Create data visualizations for briefings

**Input Schema** (Zod):
```typescript
const CreateVisualizationSchema = z.object({
  type: z.enum(['dashboard', 'timeline', 'kpi', 'trend', 'comparison']),
  data: z.record(z.any()),
  options: z.object({
    title: z.string().optional(),
    theme: z.string().optional(),
    interactive: z.boolean().default(true),
  }).optional(),
});
```

**Implementation Requirements**:
- Generate appropriate visualization type
- Apply theming if specified
- Return HTML/SVG content
- Support interactive features if enabled

### 4. search_briefings

**Purpose**: Search existing briefings

**Input Schema** (Zod):
```typescript
const SearchBriefingsSchema = z.object({
  query: z.string().optional(),
  type: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  limit: z.number().int().positive().max(100).default(10),
});
```

**Implementation Requirements**:
- Search by text query
- Filter by briefing type
- Filter by date range
- Return matching briefings with metadata

### 5. schedule_briefing

**Purpose**: Schedule recurring briefing generation

**Input Schema** (Zod):
```typescript
const ScheduleBriefingSchema = z.object({
  config: z.object({
    type: z.enum(['executive', 'technical', 'project', 'incident', 'strategic']),
    title: z.string(),
    sources: z.array(z.any()).optional(),
  }),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(),
  }),
});
```

## Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "node-fetch": "^3.3.2",
    "marked": "^11.1.1",
    "puppeteer": "^21.7.0",
    "plotly.js-dist": "^2.28.0",
    "redis": "^4.6.12"
  }
}
```

### File Structure

```
mcp-briefing/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── briefing-generator.ts       # Core briefing generation logic
│   ├── data-aggregator.ts         # Multi-source data aggregation
│   ├── template-engine.ts         # Template processing and formatting
│   ├── visualization-engine.ts    # Chart and visualization creation
│   └── types.ts                   # TypeScript type definitions
├── PRPs/
│   ├── README.md                  # PRP documentation
│   └── mcp-briefing-server.md     # This file
├── templates/                     # Briefing templates
│   ├── executive.md
│   ├── technical.md
│   ├── project.md
│   ├── incident.md
│   └── strategic.md
├── package.json
├── tsconfig.json
└── README.md
```

### Core Classes

#### BriefingGenerator

```typescript
export class BriefingGenerator {
  async generate(config: BriefingConfig): Promise<Briefing>;
  async search(params: SearchParams): Promise<Briefing[]>;
  async getStatus(briefingId: string): Promise<BriefingStatus>;
  async export(briefingId: string, format: string, options?: any): Promise<ExportResult>;
  async schedule(config: any, schedule: Schedule): Promise<ScheduleResult>;
}
```

#### DataAggregator

```typescript
export class DataAggregator {
  async aggregate(sources: DataSource[], filters?: any): Promise<AggregatedData>;
  private async fetchGithubData(config: any): Promise<any>;
  private async queryDatabase(config: any): Promise<any>;
  private async fetchApiData(config: any): Promise<any>;
  private normalizeData(data: any[]): Promise<any>;
}
```

#### TemplateEngine

```typescript
export class TemplateEngine {
  async format(briefing: Briefing, format: string): Promise<string | Buffer>;
  async listTemplates(): Promise<Template[]>;
  private async convertToPdf(html: string): Promise<Buffer>;
  private async convertToPowerPoint(briefing: Briefing): Promise<Buffer>;
}
```

#### VisualizationEngine

```typescript
export class VisualizationEngine {
  async create(type: string, data: any, options?: any): Promise<string>;
  private createDashboard(data: any, options: any): Promise<string>;
  private createTimeline(data: any, options: any): Promise<string>;
  private createKpiChart(data: any, options: any): Promise<string>;
}
```

## Validation Gates

1. **TypeScript Compilation**: All code must pass `tsc --noEmit`
2. **Zod Schema Validation**: All inputs validated with proper error messages
3. **Unit Tests**: Core functionality tested with Vitest
4. **Integration Tests**: MCP server tested with MCP Inspector
5. **Error Handling**: All async operations wrapped in try/catch with proper error responses

## Response Format

All tools MUST return MCP-compatible responses:

```typescript
// Success response
{
  content: [{
    type: "text",
    text: "Formatted briefing content or JSON data"
  }]
}

// Error response
{
  content: [{
    type: "text",
    text: "**Error**\n\nError message with details",
    isError: true
  }]
}
```

## Security Considerations

1. **Input Validation**: All inputs validated with Zod schemas
2. **Data Source Authentication**: Secure credential management for external sources
3. **SQL Injection Protection**: Parameterized queries for database sources
4. **Rate Limiting**: Implement rate limits for API calls
5. **Error Sanitization**: Never expose sensitive information in error messages

## Performance Requirements

1. **Concurrent Data Fetching**: Use Promise.all() for parallel source queries
2. **Caching**: Redis caching for frequently accessed data
3. **Streaming**: Support streaming for large datasets
4. **Pagination**: Implement pagination for search results
5. **Timeout Handling**: 30-second timeout for all external calls

## Deployment

The server can be deployed as:
1. **NPM Package**: Published to npm registry
2. **Docker Container**: With all dependencies included
3. **Standalone Binary**: Using pkg or similar tools

## Example Usage

```bash
# Add to Claude Desktop
claude mcp add mcp-briefing npx @diegofornalha/mcp-briefing

# Generate executive briefing
# In Claude: "Generate an executive briefing for Q4 2024"

# The MCP server will:
# 1. Aggregate data from configured sources
# 2. Apply executive template
# 3. Create visualizations
# 4. Return formatted markdown/PDF
```

## Success Criteria

1. Successfully generates briefings for all 5 types
2. Aggregates data from at least 3 different source types
3. Creates interactive visualizations
4. Exports to all specified formats
5. Handles errors gracefully with informative messages
6. Completes typical briefing generation in under 30 seconds