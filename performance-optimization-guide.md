# Performance Optimization Quick Reference

## 🚨 CRITICAL: Top 5 Performance Killers & Solutions

### 1. ❌ Sequential Execution (70% Performance Loss)
```javascript
// ❌ WRONG - Sequential (10x slower)
Message 1: TodoWrite({ todo: "single" })
Message 2: Task("agent1")
Message 3: Task("agent2")
Message 4: Read("file1")
Message 5: Write("output")

// ✅ CORRECT - Parallel (10x faster)
[Single Message]:
  - TodoWrite { todos: [ALL 10+ todos] }
  - Task("agent1", full_instructions)
  - Task("agent2", full_instructions)
  - Task("agent3", full_instructions)
  - Read("file1")
  - Read("file2")
  - Write("output1")
  - Write("output2")
```

### 2. ❌ Agent Underutilization (60% Efficiency Loss)
```javascript
// ❌ WRONG - Too few agents
1 agent handling everything sequentially

// ✅ CORRECT - Optimal agent distribution
- Simple tasks: 3-4 agents
- Medium tasks: 5-7 agents  
- Complex tasks: 8-12 agents
ALL spawned in ONE message!
```

### 3. ❌ Memory Access Patterns (30% Overhead)
```javascript
// ❌ WRONG - Individual operations
store("key1", value1)
store("key2", value2)
retrieve("key3")

// ✅ CORRECT - Batched operations
mcp__claude-flow__memory_usage {
  action: "batch",
  operations: [...all operations]
}
```

### 4. ❌ Missing Coordination Hooks (40% Efficiency Loss)
```javascript
// ❌ WRONG - No coordination
Task("Do something")

// ✅ CORRECT - Full coordination
Task(`
  MANDATORY COORDINATION:
  1. START: npx claude-flow@alpha hooks pre-task
  2. DURING: npx claude-flow@alpha hooks post-edit
  3. MEMORY: npx claude-flow@alpha hooks notify
  4. END: npx claude-flow@alpha hooks post-task
  
  Your task: [detailed instructions]
`)
```

### 5. ❌ Inefficient File Operations (50% I/O Overhead)
```javascript
// ❌ WRONG - Sequential file ops
Read("file1")
Process()
Read("file2")
Process()

// ✅ CORRECT - Batch all reads first
[Single Message]:
  - Read("file1")
  - Read("file2")
  - Read("file3")
  - Process all data
  - Write all outputs
```

## ⚡ Performance Optimization Checklist

Before ANY operation, ask yourself:

### 🎯 Parallel Execution
- [ ] Are ALL TodoWrite operations in ONE call?
- [ ] Are ALL Task spawns in ONE message?
- [ ] Are ALL file operations batched?
- [ ] Are ALL bash commands grouped?
- [ ] Are ALL memory operations concurrent?

### 🤖 Agent Optimization
- [ ] Using 3+ agents for complex tasks?
- [ ] All agents spawned together?
- [ ] Each agent has coordination hooks?
- [ ] Agent types match task requirements?
- [ ] Memory sharing enabled between agents?

### 💾 Memory Efficiency
- [ ] Batch memory operations?
- [ ] Use memory keys effectively?
- [ ] Store coordination points?
- [ ] Cache frequent lookups?
- [ ] Clean old memory periodically?

### 🔄 Workflow Patterns
- [ ] Use hierarchical topology for complex tasks?
- [ ] Enable mesh topology for collaboration?
- [ ] Implement adaptive coordination?
- [ ] Monitor performance metrics?
- [ ] Optimize based on bottlenecks?

## 📊 Performance Benchmarks

### Current vs Optimized Performance
| Metric | Current | Optimized | Improvement |
|--------|---------|-----------|-------------|
| Avg Task Time | 9.98s | 2.5s | 4x faster |
| Daily Throughput | 215 | 860 | 4x more |
| Success Rate | 88.6% | 95%+ | 7% better |
| Memory Efficiency | 93% | 98% | 5% better |
| Parallel Execution | 20% | 90% | 70% more |

## 🚀 Quick Wins (Implement Today!)

1. **Batch ALL Operations**
   - Never send multiple messages for related tasks
   - Combine everything in single BatchTool message

2. **Spawn More Agents**
   - Minimum 3 agents for any non-trivial task
   - All spawned in parallel, not sequential

3. **Use Coordination Hooks**
   - Every agent MUST use pre/post hooks
   - Store all decisions in memory

4. **Optimize File I/O**
   - Read all files first, then process
   - Write all outputs together

5. **Monitor & Iterate**
   - Check performance metrics daily
   - Identify new bottlenecks
   - Continuous optimization

## 🎯 Golden Rule

**"If you need to do X operations, do them in 1 message, not X messages!"**

---

*Performance Optimization Guide v1.0*  
*Update based on latest bottleneck analysis*