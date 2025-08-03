/**
 * Exemplo de como o Briefing Specialist Subagent usaria o MCP Briefing
 * (após o servidor estar instalado e rodando)
 */

// No contexto do Claude Code com MCP Briefing instalado:

async function generateExecutiveBriefing() {
  // 1. Gerar briefing executivo
  const briefing = await mcp__mcp_briefing__generate_briefing({
    type: "executive",
    title: "Q1 2025 MCP Integration Status",
    timeframe: {
      start: "2025-01-01",
      end: "2025-03-31"
    },
    sources: [
      {
        type: "github",
        config: {
          org: "diegofornalha",
          repo: "context-engineering-turso"
        }
      },
      {
        type: "metrics",
        config: {
          service: "claude-flow",
          metrics: ["swarm_performance", "agent_efficiency"]
        }
      }
    ],
    sections: [
      "executive_summary",
      "key_achievements",
      "performance_metrics",
      "recommendations"
    ],
    format: "pdf"
  });

  // 2. Criar visualizações
  const dashboard = await mcp__mcp_briefing__create_visualization({
    type: "dashboard",
    data: briefing.metrics,
    config: {
      charts: [
        { type: "line", metric: "task_completion_rate" },
        { type: "bar", metric: "agent_utilization" },
        { type: "pie", metric: "task_distribution" }
      ]
    }
  });

  // 3. Agregar dados de múltiplas fontes
  const aggregatedData = await mcp__mcp_briefing__aggregate_data({
    sources: [
      { type: "database", query: "SELECT * FROM performance_metrics" },
      { type: "api", endpoint: "/api/v1/stats" },
      { type: "file", path: "./reports/monthly.json" }
    ],
    aggregation: {
      method: "average",
      groupBy: "week",
      metrics: ["response_time", "success_rate"]
    }
  });

  // 4. Buscar briefings anteriores
  const previousBriefings = await mcp__mcp_briefing__search_briefings({
    query: "MCP integration",
    timeframe: "last_30_days",
    tags: ["executive", "quarterly"],
    limit: 5
  });

  // 5. Agendar briefing recorrente
  const schedule = await mcp__mcp_briefing__schedule_briefing({
    frequency: "weekly",
    day: "monday",
    time: "09:00",
    config: {
      type: "status_update",
      recipients: ["team@example.com"],
      autoGenerate: true
    }
  });

  return {
    briefing,
    dashboard,
    aggregatedData,
    previousBriefings,
    schedule
  };
}

// Como o subagente usaria no contexto real:
// O briefing-specialist teria acesso direto a essas ferramentas MCP