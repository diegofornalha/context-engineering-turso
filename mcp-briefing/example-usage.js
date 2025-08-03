/**
 * Exemplo de uso do MCP Briefing Simplificado
 * Output: JSON simples
 */

// 1. Gerar um briefing simples
const briefingExample = {
  tool: "mcp__mcp-briefing__generate_briefing",
  params: {
    title: "Status do Projeto MCP Integration",
    topic: "Integração de servidores MCP",
    sections: ["summary", "key_points", "recommendations", "metrics"],
    data: {
      project_name: "context-engineering-turso",
      mcp_servers: ["claude-flow", "turso", "mcp-briefing"],
      status: "em desenvolvimento"
    }
  },
  output: {
    "id": "briefing_1735906800000",
    "title": "Status do Projeto MCP Integration",
    "topic": "Integração de servidores MCP",
    "generated_at": "2025-01-03T10:00:00.000Z",
    "sections": {
      "summary": "This briefing covers Integração de servidores MCP. Generated on 03/01/2025 for quick reference and decision making.",
      "key_points": [
        "Main focus area: Integração de servidores MCP",
        "Data has been aggregated from available sources",
        "Analysis includes latest available information",
        "Recommendations based on current trends"
      ],
      "recommendations": [
        "Continue monitoring the situation",
        "Review detailed metrics in appendix",
        "Schedule follow-up briefing if needed"
      ],
      "metrics": {
        "total_items": 42,
        "completion_rate": "87%",
        "trend": "increasing"
      },
      "additional_data": {
        "project_name": "context-engineering-turso",
        "mcp_servers": ["claude-flow", "turso", "mcp-briefing"],
        "status": "em desenvolvimento"
      }
    },
    "metadata": {
      "version": "1.0",
      "generator": "mcp-briefing"
    }
  }
};

// 2. Agregar dados de múltiplas fontes
const aggregateExample = {
  tool: "mcp__mcp-briefing__aggregate_data",
  params: {
    sources: [
      {
        name: "github_metrics",
        data: {
          pull_requests: 15,
          issues_closed: 23,
          commits: 147
        }
      },
      {
        name: "performance_data",
        data: {
          response_time_ms: 245,
          uptime_percent: 99.9,
          error_rate: 0.01
        }
      },
      {
        name: "team_productivity",
        data: {
          tasks_completed: 89,
          velocity: 34,
          sprint_progress: 0.78
        }
      }
    ]
  },
  output: {
    "id": "aggregate_1735906800000",
    "timestamp": "2025-01-03T10:00:00.000Z",
    "source_count": 3,
    "data": {
      "github_metrics": {
        "pull_requests": 15,
        "issues_closed": 23,
        "commits": 147
      },
      "performance_data": {
        "response_time_ms": 245,
        "uptime_percent": 99.9,
        "error_rate": 0.01
      },
      "team_productivity": {
        "tasks_completed": 89,
        "velocity": 34,
        "sprint_progress": 0.78
      }
    },
    "summary": {
      "github_metrics": {
        "keys": ["pull_requests", "issues_closed", "commits"],
        "item_count": 3
      },
      "performance_data": {
        "keys": ["response_time_ms", "uptime_percent", "error_rate"],
        "item_count": 3
      },
      "team_productivity": {
        "keys": ["tasks_completed", "velocity", "sprint_progress"],
        "item_count": 3
      }
    }
  }
};

// 3. Buscar briefings existentes
const searchExample = {
  tool: "mcp__mcp-briefing__search_briefings",
  params: {
    query: "project status",
    limit: 3
  },
  output: {
    "query": "project status",
    "found": 3,
    "briefings": [
      {
        "id": "briefing_001",
        "title": "Q4 2024 Summary",
        "topic": "quarterly_review",
        "created": "2024-12-31T23:59:59Z",
        "relevance": 0.95
      },
      {
        "id": "briefing_002",
        "title": "Project Status Update",
        "topic": "project_management",
        "created": "2024-12-15T10:00:00Z",
        "relevance": 0.80
      },
      {
        "id": "briefing_003",
        "title": "Technical Architecture Review",
        "topic": "architecture",
        "created": "2024-12-01T14:30:00Z",
        "relevance": 0.75
      }
    ]
  }
};

console.log("=== MCP Briefing Examples ===\n");
console.log("1. Generate Briefing:");
console.log(JSON.stringify(briefingExample, null, 2));
console.log("\n2. Aggregate Data:");
console.log(JSON.stringify(aggregateExample, null, 2));
console.log("\n3. Search Briefings:");
console.log(JSON.stringify(searchExample, null, 2));