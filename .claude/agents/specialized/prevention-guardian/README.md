# 🛡️ Prevention Guardian Agent

An autonomous maintenance agent that uses Claude Flow, SPARC methodology, and specialized subagents to prevent code duplications and maintain quality.

## 🎯 Purpose

The Prevention Guardian operates 24/7 to:
- Prevent code duplications before they accumulate
- Fix issues automatically using SPARC methodology
- Generate comprehensive documentation via PRPs
- Learn from patterns to improve detection

## 🚀 Quick Start

### Using Claude Code

```bash
# Start the prevention guardian
Task "Start prevention guardian agent" "prevention-guardian"

# Check status
Task "Prevention guardian status" "prevention-guardian"

# Force immediate scan
Task "Scan codebase for issues now" "prevention-guardian"
```

### Using Claude Flow CLI

```bash
# Start in daemon mode
npx claude-flow prevention-guardian start --daemon

# Interactive mode
npx claude-flow prevention-guardian start

# Custom configuration
npx claude-flow prevention-guardian start --config ./custom-config.json
```

## 🏗️ Architecture

```
Prevention Guardian
├── Detection Swarm
│   ├── file-scanner
│   ├── duplicate-detector
│   └── pattern-analyzer
├── Analysis Swarm
│   ├── code-analyzer
│   ├── architecture-validator
│   └── dependency-checker
├── Correction Swarm
│   ├── sparc-coder
│   ├── refactoring-specialist
│   └── test-generator
└── Documentation Swarm
    ├── prp-specialist
    ├── doc-generator
    └── changelog-updater
```

## 📋 Features

### Autonomous Detection
- Continuous scanning with configurable intervals
- Pattern-based duplicate detection
- Architecture violation identification
- Missing test detection
- Import issue analysis

### SPARC-Based Correction
- Automated fix generation using SPARC methodology
- TDD approach for all changes
- Comprehensive test generation
- Safe refactoring with rollback

### PRP Documentation
- Automatic PRP generation for all changes
- Detailed metrics and learnings
- Implementation guides
- Prevention rules documentation

### Neural Learning
- Pattern recognition improvement
- False positive reduction
- Predictive issue detection
- Continuous model training

## 🔧 Configuration

Edit `config.json` to customize:

```json
{
  "settings": {
    "scan_interval": 3600,      // 1 hour
    "auto_fix": true,           // Apply fixes automatically
    "generate_prps": true,      // Generate PRPs
    "max_agents": 8             // Maximum concurrent agents
  },
  "detection": {
    "duplication_threshold": 0.8,  // 80% similarity
    "ignore_patterns": ["*.test.js", "node_modules/**"]
  }
}
```

## 📊 Metrics

The agent tracks:
- Duplications prevented
- Code quality score (0-100)
- Auto fixes applied
- PRPs generated
- Neural accuracy
- System performance

View metrics:
```bash
Task "Show prevention guardian dashboard" "prevention-guardian"
```

## 🤝 Integration

### Claude Flow
- Uses swarm orchestration
- Memory persistence
- Neural training
- Task coordination

### Turso MCP
- Stores PRPs
- Persists metrics
- Maintains history

### GitHub Actions
- Scheduled scans
- PR validation
- Deployment checks

## 📝 Examples

See `examples.md` for detailed usage examples including:
- Duplication detection and fixing
- Architecture violation correction
- Monitoring dashboards
- PRP generation
- Pattern learning

## 🛠️ Tools

The agent includes specialized tools for:
- Code scanning and analysis
- Pattern detection
- SPARC implementation
- Test generation
- Documentation creation

See `tools.md` for complete tool documentation.

## 🚨 Troubleshooting

### Agent not detecting issues
1. Check `ignore_patterns` in config
2. Verify `scan_extensions` includes your file types
3. Ensure `duplication_threshold` isn't too high

### Fixes not being applied
1. Verify `auto_fix` is enabled
2. Check `max_changes_per_run` limit
3. Ensure tests are passing

### High false positive rate
1. Increase `duplication_threshold`
2. Add patterns to `ignore_patterns`
3. Wait for neural training to improve

## 📈 Best Practices

1. **Start Conservative**: Begin with high thresholds and adjust down
2. **Review PRPs**: Check generated PRPs initially to ensure quality
3. **Monitor Metrics**: Use dashboard to track effectiveness
4. **Custom Patterns**: Add project-specific patterns to config
5. **Regular Training**: Allow neural models to learn from your codebase

## 🔄 Updates

The agent self-improves through:
- Neural pattern learning
- PRP-based documentation
- Metric-driven optimization
- Community feedback integration

---

For more information, see the [main PRP document](./prevention-guardian.md) or check the [examples](./examples.md).