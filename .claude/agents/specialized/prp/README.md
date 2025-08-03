# PRP Specialist Agent

## Overview

The PRP Specialist Agent is a comprehensive solution for creating, validating, storing, and managing Persona-Reference Pattern (PRP) documents within the Claude Flow ecosystem. It follows SPARC methodology and integrates seamlessly with existing infrastructure.

## Features

- **Complete PRP Lifecycle Management**: Creation, validation, storage, querying, and updates
- **PydanticAI Integration**: Robust validation using Pydantic models
- **MCP Turso Persistence**: Reliable storage using MCP tools
- **Existing System Integration**: Works with the current prp-agent Python system
- **SPARC Methodology**: Follows systematic development approach

## Components

### 1. PRP Specialist Agent (`prp-specialist.md`)

The main agent file that defines:
- Core responsibilities and technical expertise
- Complete workflow process following SPARC phases
- Quality checklists and success criteria
- Integration patterns with existing systems
- Comprehensive PRP template

### 2. Python Integration Module (`prp_integration.py`)

A Python module that provides:
- PRP model validation using Pydantic
- File system storage management
- Search and query capabilities
- Markdown/JSON format conversion
- CLI interface for operations

### 3. PRP Generator Agent (`prp-generator.md`)

The existing agent that:
- Provides basic PRP generation capabilities
- Integrates with virtual environments
- Includes pre/post hooks for coordination

## Usage

### Via Claude Code Task Tool

```bash
# Generate a new PRP
Task("Create a comprehensive PRP for authentication system with OAuth2, JWT, and session management", "prp-specialist")

# Validate existing PRP
Task("Validate and improve PRP_AUTH_SYSTEM with latest security practices", "prp-specialist")

# Search for PRPs
Task("Find all PRPs related to API integration and create cross-references", "prp-specialist")
```

### Via Python CLI

```bash
# Generate PRP
cd .claude/agents/specialized/prp
python prp_integration.py generate --topic "Authentication System" --context "OAuth2 implementation"

# Search PRPs
python prp_integration.py search --query "authentication"

# Load PRP
python prp_integration.py load --id "PRP_AUTHENTICATION_SYSTEM" --format markdown

# Validate PRP
python prp_integration.py validate --id "PRP_AUTHENTICATION_SYSTEM"

# Update PRP
python prp_integration.py update --id "PRP_AUTHENTICATION_SYSTEM" --updates '{"status": "Active"}'
```

### Via MCP Tools

```javascript
// Store PRP in Turso
mcp__mcp_turso__add_knowledge({
  topic: "PRP_AUTHENTICATION",
  content: prpContent,
  tags: "auth,security,oauth2",
  source: "prp-specialist"
});

// Query PRPs
mcp__mcp_turso__search_knowledge({
  query: "authentication oauth2",
  limit: 10
});
```

## PRP Standard Format

All PRPs follow this structure:

```markdown
# 🧠 PRP: [Context Name]

## 📋 Basic Information
- **ID**: PRP_[UNIQUE_IDENTIFIER]
- **Title**: [Descriptive Title]
- **Created**: [YYYY-MM-DD]
- **Status**: Active/In Development/Archived
- **Priority**: High/Medium/Low
- **Tags**: [tag1, tag2, tag3]

## 🎯 Objective
[Clear description of purpose]

## 🏗️ Architecture
[System components and integration points]

## 🔄 Workflow
[Step-by-step process]

## 📊 Use Cases
[Practical application examples]

## 🔗 References
[Internal and external links]

## 📝 Implementation Notes
[Technical details and considerations]

## 🔄 Version History
[Change tracking]
```

## Integration Points

### 1. Existing PRP Agent
- Located at: `/Users/agents/Desktop/context-engineering-turso/prp-agent`
- Integration via Python imports
- Shared templates and validation

### 2. MCP Turso
- Primary persistence layer
- Full-text search capabilities
- Cross-reference management

### 3. Claude Flow Hooks
- Pre-task: Initialize and check existing PRPs
- Post-edit: Validate and store changes
- Post-task: Performance analysis and cleanup

## Best Practices

1. **Always validate** PRPs before storage using Pydantic models
2. **Use consistent IDs** following the PRP_[TOPIC] pattern
3. **Include practical examples** in every PRP
4. **Maintain cross-references** between related PRPs
5. **Version all changes** with clear descriptions
6. **Test code examples** before including them
7. **Store immediately** in Turso after generation

## Error Handling

The system includes comprehensive error handling for:
- Validation failures
- Storage errors
- Search timeouts
- Integration issues

All errors are logged with context for debugging.

## Performance Optimization

- **Caching**: Frequently accessed PRPs are cached
- **Batch Operations**: Multiple PRPs can be processed in parallel
- **Index Optimization**: Search indices are maintained for quick queries
- **Lazy Loading**: Large PRPs are loaded on demand

## Dependencies

- Python 3.8+
- pydantic
- pydantic-ai (optional but recommended)
- MCP Turso tools
- Claude Flow ecosystem

## Future Enhancements

- [ ] GraphQL API for PRP queries
- [ ] Visual PRP relationship mapping
- [ ] Automated PRP generation from code
- [ ] Version control integration
- [ ] Multi-language PRP support
- [ ] AI-powered PRP suggestions

## Support

For issues or questions:
1. Check existing PRPs for examples
2. Review error logs in `.claude/logs/`
3. Use validation tools to debug
4. Consult the main Claude Flow documentation