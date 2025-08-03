# Prevention Guardian Tools

## Detection Tools

### scan_for_duplications
Scan codebase for duplicate code patterns
- Uses AST analysis for semantic similarity
- Configurable threshold (default: 80%)
- Ignores test files and generated code

### detect_outdated_imports
Find imports that reference removed or deprecated modules
- Checks against package.json/requirements.txt
- Validates import paths exist
- Identifies circular dependencies

### analyze_architecture_violations
Detect violations of architectural patterns
- Validates layer separation
- Checks dependency directions
- Ensures proper module boundaries

### find_missing_tests
Identify code without corresponding tests
- Maps source files to test files
- Calculates coverage gaps
- Prioritizes critical paths

## Analysis Tools

### calculate_technical_debt
Quantify technical debt in the codebase
- Complexity metrics (cyclomatic, cognitive)
- Duplication percentage
- Test coverage gaps
- Documentation coverage

### prioritize_issues
Rank issues by impact and effort
- Severity scoring algorithm
- Effort estimation
- Risk assessment
- ROI calculation

### generate_fix_strategy
Create SPARC-based fix strategies
- Specification generation
- Implementation planning
- Test requirements
- Documentation needs

## Correction Tools

### apply_sparc_fix
Execute fixes using SPARC methodology
- Generate specification from issue
- Create pseudocode solution
- Design architecture changes
- Implement with TDD
- Complete with validation

### refactor_duplications
Remove code duplications intelligently
- Extract common functionality
- Create shared utilities
- Update all references
- Add comprehensive tests

### update_imports
Fix import issues automatically
- Update import paths
- Remove unused imports
- Add missing imports
- Organize import order

### generate_missing_tests
Create tests for uncovered code
- Use TDD London School approach
- Generate comprehensive test cases
- Mock external dependencies
- Achieve 100% coverage

## Documentation Tools

### generate_prp
Create PRP documentation for changes
- Standard PRP format
- Include metrics and learnings
- Add implementation details
- Document prevention rules

### update_changelog
Maintain project changelog
- Semantic versioning
- Categorized changes
- Breaking change warnings
- Migration guides

### create_metrics_report
Generate detailed metrics reports
- Performance improvements
- Quality metrics
- Trend analysis
- Predictive insights

## Memory Tools

### store_pattern
Store detected patterns in memory
- Pattern signature
- Detection context
- Fix applied
- Success metrics

### retrieve_similar_issues
Find similar issues from history
- Pattern matching
- Context similarity
- Previous fixes
- Success rates

### train_detection_model
Update neural detection models
- New pattern examples
- False positive corrections
- Success/failure feedback
- Accuracy improvements

## Integration Tools

### orchestrate_detection_swarm
Coordinate multiple detection agents
- Parallel file scanning
- Result aggregation
- Conflict resolution
- Performance optimization

### spawn_specialist_agent
Create specialized subagents
- Agent type selection
- Task assignment
- Result collection
- Performance monitoring

### generate_dashboard_data
Prepare data for monitoring dashboard
- Real-time metrics
- Historical trends
- Predictive analytics
- Alert thresholds

## Utility Tools

### validate_fix
Ensure fixes don't break existing code
- Run test suite
- Check dependencies
- Validate performance
- Ensure backwards compatibility

### estimate_impact
Calculate impact of proposed changes
- Affected files count
- User impact assessment
- Performance implications
- Risk evaluation

### schedule_scan
Configure scanning schedule
- Cron expression parsing
- Resource availability check
- Priority queue management
- Conflict avoidance