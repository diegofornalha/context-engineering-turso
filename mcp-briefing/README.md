# 📊 MCP Briefing Server

An intelligent MCP (Model Context Protocol) server for generating, managing, and distributing comprehensive briefings. Perfect for executive summaries, technical reports, project updates, and strategic planning documents.

## 🚀 Features

- **Multi-source Data Aggregation**: Collect data from GitHub, APIs, databases, and files
- **Intelligent Content Synthesis**: AI-powered analysis and summarization
- **Multiple Briefing Types**: Executive, Technical, Project, Incident, Strategic
- **Rich Visualizations**: Interactive charts and dashboards
- **Multi-format Export**: PDF, PowerPoint, Word, HTML, Markdown
- **Real-time Updates**: Live briefing generation with streaming data
- **Template System**: Customizable templates for different audiences
- **Scheduling**: Automated recurring briefing generation

## 📦 Installation

### As NPM Package

```bash
npm install -g @diegofornalha/mcp-briefing
```

### For Development

```bash
git clone https://github.com/diegofornalha/mcp-briefing
cd mcp-briefing
npm install
npm run build
```

## 🔧 Configuration

### Add to Claude Code

```bash
claude mcp add mcp-briefing npx @diegofornalha/mcp-briefing
```

### Environment Variables

Create a `.env` file:

```env
# GitHub Integration
GITHUB_TOKEN=your_github_token

# Database Connections (optional)
DATABASE_URL=postgresql://user:pass@host:port/db

# API Keys (optional)
OPENAI_API_KEY=your_openai_key
SLACK_TOKEN=your_slack_token

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

## 🛠️ Available Tools

### 1. `generate_briefing`

Generate a comprehensive briefing based on type and requirements.

```javascript
await mcp.generate_briefing({
  type: "executive",
  title: "Q4 2024 Performance Review",
  timeframe: {
    start: "2024-10-01",
    end: "2024-12-31"
  },
  sources: [
    {
      type: "github",
      config: {
        repo: "org/repo",
        metrics: ["prs", "commits", "issues"]
      }
    }
  ],
  format: "pdf",
  audience: "board_members"
});
```

### 2. `aggregate_data`

Collect and normalize data from multiple sources.

```javascript
await mcp.aggregate_data({
  sources: [
    {
      type: "api",
      name: "sales_api",
      config: {
        endpoint: "https://api.company.com/sales",
        headers: { "Authorization": "Bearer token" }
      }
    },
    {
      type: "database",
      name: "analytics_db",
      config: {
        query: "SELECT * FROM metrics WHERE date >= '2024-01-01'"
      }
    }
  ],
  filters: {
    department: "engineering",
    region: "north_america"
  }
});
```

### 3. `create_visualization`

Generate interactive visualizations for briefings.

```javascript
await mcp.create_visualization({
  type: "dashboard",
  data: {
    revenue: { dates: [...], values: [...] },
    metrics: { kpis: [...] }
  },
  options: {
    title: "Executive Dashboard",
    theme: "corporate",
    interactive: true
  }
});
```

### 4. `search_briefings`

Search through existing briefings.

```javascript
await mcp.search_briefings({
  query: "revenue growth",
  type: "executive",
  dateRange: {
    start: "2024-01-01",
    end: "2024-12-31"
  },
  limit: 10
});
```

### 5. `schedule_briefing`

Set up recurring briefing generation.

```javascript
await mcp.schedule_briefing({
  config: {
    type: "project",
    title: "Weekly Project Status",
    sources: [...]
  },
  schedule: {
    frequency: "weekly",
    time: "09:00",
    timezone: "America/New_York"
  }
});
```

## 📊 Briefing Types

### Executive Briefing
- KPI dashboards
- Revenue metrics
- Strategic insights
- Competitive analysis

### Technical Report
- Code metrics
- Architecture updates
- Performance analysis
- Security assessments

### Project Update
- Timeline visualization
- Budget tracking
- Resource utilization
- Risk assessment

### Incident Response
- Real-time status
- Impact analysis
- Mitigation progress
- Lessons learned

### Strategic Planning
- Market analysis
- SWOT assessment
- Roadmap visualization
- Resource planning

## 🎨 Templates

The server includes pre-built templates for common briefing types:

- `executive_summary.md`
- `technical_report.md`
- `project_status.md`
- `incident_response.md`
- `strategic_plan.md`

Custom templates can be added to the `templates/` directory.

## 🔌 Integration Examples

### With Claude Code

```javascript
// Generate monthly executive briefing
const briefing = await mcp_briefing.generate_briefing({
  type: "executive",
  title: "Monthly Executive Summary",
  sources: [
    { type: "github", config: { org: "mycompany" } },
    { type: "metrics", config: { service: "datadog" } }
  ],
  format: "pdf"
});
```

### With GitHub Actions

```yaml
name: Weekly Briefing
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM

jobs:
  generate-briefing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate Briefing
        run: |
          npx @diegofornalha/mcp-briefing generate \
            --type project \
            --title "Weekly Project Status" \
            --format pdf \
            --output briefing.pdf
      - name: Upload Briefing
        uses: actions/upload-artifact@v3
        with:
          name: weekly-briefing
          path: briefing.pdf
```

## 🚀 Advanced Features

### Real-time Briefings
```javascript
// Subscribe to real-time updates
const stream = await mcp_briefing.stream_briefing({
  type: "incident",
  updateInterval: 60, // seconds
  sources: [
    { type: "metrics", config: { stream: true } }
  ]
});

stream.on('update', (briefing) => {
  console.log('New briefing update:', briefing);
});
```

### Custom Data Sources
```javascript
// Register custom data source
mcp_briefing.registerSource('custom_api', {
  fetch: async (config, timeframe) => {
    // Custom data fetching logic
    return data;
  },
  normalize: (rawData) => {
    // Transform to standard format
    return normalizedData;
  }
});
```

## 📈 Performance

- Concurrent data fetching from multiple sources
- Redis caching for improved performance
- Streaming support for large datasets
- Optimized visualization rendering

## 🔒 Security

- Secure credential management
- Data encryption in transit
- Access control for sensitive briefings
- Audit logging for compliance

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- Documentation: [https://github.com/diegofornalha/mcp-briefing/wiki](https://github.com/diegofornalha/mcp-briefing/wiki)
- Issues: [https://github.com/diegofornalha/mcp-briefing/issues](https://github.com/diegofornalha/mcp-briefing/issues)
- Discussions: [https://github.com/diegofornalha/mcp-briefing/discussions](https://github.com/diegofornalha/mcp-briefing/discussions)

---

Built with ❤️ for better decision-making through intelligent briefings.