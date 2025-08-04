# CRUD API Patterns for PRP System

This document provides comprehensive patterns and best practices for implementing CRUD (Create, Read, Update, Delete) operations in the PRP API system.

## Table of Contents
- [RESTful Design Principles](#restful-design-principles)
- [Standard CRUD Operations](#standard-crud-operations)
- [Advanced Query Patterns](#advanced-query-patterns)
- [Batch Operations](#batch-operations)
- [Soft Delete Pattern](#soft-delete-pattern)
- [Optimistic Locking](#optimistic-locking)
- [Audit Trail](#audit-trail)
- [Performance Optimization](#performance-optimization)

## RESTful Design Principles

### Resource Naming Conventions

```
GET    /api/v1/prps              # List all PRPs
POST   /api/v1/prps              # Create a new PRP
GET    /api/v1/prps/:id          # Get a specific PRP
PUT    /api/v1/prps/:id          # Full update of a PRP
PATCH  /api/v1/prps/:id          # Partial update of a PRP
DELETE /api/v1/prps/:id          # Delete a PRP

# Nested resources
GET    /api/v1/projects/:projectId/prps     # List PRPs for a project
POST   /api/v1/prps/:id/comments            # Add comment to PRP
GET    /api/v1/prps/:id/history             # Get PRP history
```

## Standard CRUD Operations

### Create (POST)

```typescript
// Server Implementation
interface CreatePRPDto {
  projectId: string;
  name: string;
  description: string;
  requirements: string[];
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  metadata?: Record<string, any>;
}

// Validation schema
const createPRPSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  requirements: z.array(z.string()).min(1).max(20),
  estimatedHours: z.number().positive().max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional()
});

// Controller
export class PRPController {
  async create(req: Request, res: Response) {
    try {
      // Validate input
      const data = createPRPSchema.parse(req.body);
      
      // Check project exists and user has access
      const project = await this.projectService.findById(data.projectId);
      if (!project) {
        return res.status(404).json({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        });
      }
      
      if (!await this.authService.canAccessProject(req.user, project)) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied to project'
        });
      }
      
      // Create PRP with transaction
      const prp = await this.db.transaction(async (trx) => {
        // Create PRP
        const prp = await trx.prps.create({
          id: generateId('prp'),
          ...data,
          status: 'pending',
          createdBy: req.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Create initial history entry
        await trx.prpHistory.create({
          prpId: prp.id,
          action: 'created',
          userId: req.user.id,
          changes: { initial: data },
          timestamp: new Date()
        });
        
        // Index for search
        await this.searchService.indexPRP(prp);
        
        return prp;
      });
      
      // Emit event
      this.eventEmitter.emit('prp.created', {
        prp,
        userId: req.user.id
      });
      
      // Return created resource
      res.status(201)
        .location(`/api/v1/prps/${prp.id}`)
        .json(this.serializePRP(prp));
        
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: error.errors
        });
      }
      
      this.logger.error('Create PRP error:', error);
      res.status(500).json({
        code: 'SERVER_ERROR',
        message: 'Failed to create PRP'
      });
    }
  }
}
```

### Read (GET)

#### List with Filtering, Sorting, and Pagination

```typescript
// Query parameters interface
interface ListPRPsQuery {
  // Pagination
  page?: number;
  limit?: number;
  cursor?: string;
  
  // Filtering
  status?: string | string[];
  priority?: string | string[];
  projectId?: string;
  assignedTo?: string;
  createdBy?: string;
  tags?: string[];
  search?: string;
  
  // Date ranges
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  
  // Sorting
  sort?: string;
  order?: 'asc' | 'desc';
  
  // Field selection
  fields?: string;
  include?: string[];
  exclude?: string[];
}

// Query builder
class PRPQueryBuilder {
  private query: any;
  
  constructor(baseQuery: any) {
    this.query = baseQuery;
  }
  
  applyFilters(filters: ListPRPsQuery) {
    // Status filter (supports multiple values)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) 
        ? filters.status 
        : [filters.status];
      this.query = this.query.whereIn('status', statuses);
    }
    
    // Priority filter
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      this.query = this.query.whereIn('priority', priorities);
    }
    
    // Project filter
    if (filters.projectId) {
      this.query = this.query.where('projectId', filters.projectId);
    }
    
    // User filters
    if (filters.assignedTo) {
      this.query = this.query.where('assignedTo', filters.assignedTo);
    }
    
    if (filters.createdBy) {
      this.query = this.query.where('createdBy', filters.createdBy);
    }
    
    // Tag filter (array contains)
    if (filters.tags && filters.tags.length > 0) {
      this.query = this.query.whereRaw(
        'tags @> ?', 
        [JSON.stringify(filters.tags)]
      );
    }
    
    // Full-text search
    if (filters.search) {
      this.query = this.query.where(function() {
        this.where('name', 'ilike', `%${filters.search}%`)
          .orWhere('description', 'ilike', `%${filters.search}%`);
      });
    }
    
    // Date range filters
    if (filters.createdAfter) {
      this.query = this.query.where(
        'createdAt', 
        '>=', 
        new Date(filters.createdAfter)
      );
    }
    
    if (filters.createdBefore) {
      this.query = this.query.where(
        'createdAt', 
        '<=', 
        new Date(filters.createdBefore)
      );
    }
    
    return this;
  }
  
  applySorting(sort?: string, order: 'asc' | 'desc' = 'desc') {
    const sortableFields = [
      'createdAt', 'updatedAt', 'name', 
      'priority', 'status', 'estimatedHours'
    ];
    
    const sortField = sortableFields.includes(sort || '') 
      ? sort 
      : 'createdAt';
      
    this.query = this.query.orderBy(sortField, order);
    
    return this;
  }
  
  applyPagination(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    this.query = this.query.limit(limit).offset(offset);
    
    return this;
  }
  
  applyFieldSelection(fields?: string, include?: string[], exclude?: string[]) {
    let selectedFields = ['id', 'name', 'status', 'priority', 'createdAt'];
    
    if (fields) {
      selectedFields = fields.split(',').map(f => f.trim());
    }
    
    if (include) {
      selectedFields = [...new Set([...selectedFields, ...include])];
    }
    
    if (exclude) {
      selectedFields = selectedFields.filter(f => !exclude.includes(f));
    }
    
    this.query = this.query.select(selectedFields);
    
    return this;
  }
  
  build() {
    return this.query;
  }
}

// List endpoint implementation
async function listPRPs(req: Request, res: Response) {
  try {
    const query = req.query as ListPRPsQuery;
    
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
    
    // Build query
    const queryBuilder = new PRPQueryBuilder(db.prps);
    
    // Get total count for pagination
    const countQuery = queryBuilder
      .applyFilters(query)
      .build()
      .clone();
      
    const total = await countQuery.count('* as count').first();
    
    // Get paginated results
    const prps = await queryBuilder
      .applyFilters(query)
      .applySorting(query.sort, query.order)
      .applyPagination(page, limit)
      .applyFieldSelection(query.fields, query.include, query.exclude)
      .build();
    
    // Include related data if requested
    if (query.include?.includes('project')) {
      await db.projects.loadMany(prps, 'projectId');
    }
    
    if (query.include?.includes('assignedAgent')) {
      await db.agents.loadMany(prps, 'assignedTo');
    }
    
    // Build response
    const response = {
      data: prps.map(prp => serializePRP(prp)),
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
        hasNext: page < Math.ceil(total.count / limit),
        hasPrev: page > 1
      },
      _links: {
        self: buildUrl(req, { page, limit }),
        first: buildUrl(req, { page: 1, limit }),
        last: buildUrl(req, { page: Math.ceil(total.count / limit), limit }),
        next: page < Math.ceil(total.count / limit) 
          ? buildUrl(req, { page: page + 1, limit })
          : null,
        prev: page > 1 
          ? buildUrl(req, { page: page - 1, limit })
          : null
      }
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('List PRPs error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to list PRPs'
    });
  }
}
```

#### Get Single Resource

```typescript
async function getPRP(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { include } = req.query;
    
    // Base query
    let query = db.prps.where({ id });
    
    // Include related data
    const includeArray = include 
      ? (include as string).split(',').map(i => i.trim())
      : [];
    
    // Execute query
    const prp = await query.first();
    
    if (!prp) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'PRP not found'
      });
    }
    
    // Check access
    if (!await canAccessPRP(req.user, prp)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    // Load related data
    const result: any = { ...prp };
    
    if (includeArray.includes('project')) {
      result.project = await db.projects.findById(prp.projectId);
    }
    
    if (includeArray.includes('history')) {
      result.history = await db.prpHistory
        .where({ prpId: prp.id })
        .orderBy('timestamp', 'desc')
        .limit(10);
    }
    
    if (includeArray.includes('comments')) {
      result.comments = await db.prpComments
        .where({ prpId: prp.id })
        .orderBy('createdAt', 'desc');
    }
    
    if (includeArray.includes('attachments')) {
      result.attachments = await db.prpAttachments
        .where({ prpId: prp.id });
    }
    
    // Add computed fields
    result._links = {
      self: `/api/v1/prps/${prp.id}`,
      project: `/api/v1/projects/${prp.projectId}`,
      history: `/api/v1/prps/${prp.id}/history`,
      comments: `/api/v1/prps/${prp.id}/comments`
    };
    
    // Cache response
    res.set('Cache-Control', 'private, max-age=60');
    res.set('ETag', generateETag(result));
    
    res.json(result);
    
  } catch (error) {
    logger.error('Get PRP error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to get PRP'
    });
  }
}
```

### Update (PUT/PATCH)

#### Full Update (PUT)

```typescript
const updatePRPSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  requirements: z.array(z.string()).min(1).max(20),
  estimatedHours: z.number().positive().max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'active', 'completed', 'cancelled']),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional()
});

async function updatePRP(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = updatePRPSchema.parse(req.body);
    
    // Get existing PRP
    const existing = await db.prps.findById(id);
    
    if (!existing) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'PRP not found'
      });
    }
    
    // Check access
    if (!await canUpdatePRP(req.user, existing)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Cannot update this PRP'
      });
    }
    
    // Perform update with transaction
    const updated = await db.transaction(async (trx) => {
      // Update PRP
      const updated = await trx.prps.update(
        { id },
        {
          ...updates,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }
      ).returning('*');
      
      // Record changes in history
      const changes = calculateChanges(existing, updates);
      
      if (Object.keys(changes).length > 0) {
        await trx.prpHistory.create({
          prpId: id,
          action: 'updated',
          userId: req.user.id,
          changes,
          timestamp: new Date()
        });
      }
      
      return updated[0];
    });
    
    // Update search index
    await searchService.updatePRP(updated);
    
    // Emit event
    eventEmitter.emit('prp.updated', {
      prp: updated,
      changes: calculateChanges(existing, updates),
      userId: req.user.id
    });
    
    res.json(serializePRP(updated));
    
  } catch (error) {
    handleUpdateError(error, res);
  }
}
```

#### Partial Update (PATCH)

```typescript
// JSON Patch implementation
import { applyPatch, Operation } from 'fast-json-patch';

async function patchPRP(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const operations: Operation[] = req.body;
    
    // Validate patch operations
    if (!Array.isArray(operations)) {
      return res.status(400).json({
        code: 'INVALID_PATCH',
        message: 'Patch must be an array of operations'
      });
    }
    
    // Get existing PRP
    const existing = await db.prps.findById(id);
    
    if (!existing) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'PRP not found'
      });
    }
    
    // Apply patch
    const patched = { ...existing };
    const result = applyPatch(patched, operations, true);
    
    if (result.test === false) {
      return res.status(400).json({
        code: 'PATCH_TEST_FAILED',
        message: 'Patch test operation failed'
      });
    }
    
    // Validate patched object
    const validated = updatePRPSchema.partial().parse(patched);
    
    // Update in database
    const updated = await db.prps.update(
      { id },
      {
        ...validated,
        updatedAt: new Date(),
        updatedBy: req.user.id
      }
    ).returning('*');
    
    res.json(serializePRP(updated[0]));
    
  } catch (error) {
    handlePatchError(error, res);
  }
}
```

### Delete (DELETE)

```typescript
async function deletePRP(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    // Get PRP
    const prp = await db.prps.findById(id);
    
    if (!prp) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'PRP not found'
      });
    }
    
    // Check permissions
    if (!await canDeletePRP(req.user, prp)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Cannot delete this PRP'
      });
    }
    
    if (permanent === 'true' && req.user.role === 'admin') {
      // Hard delete
      await db.transaction(async (trx) => {
        // Delete related data
        await trx.prpHistory.where({ prpId: id }).delete();
        await trx.prpComments.where({ prpId: id }).delete();
        await trx.prpAttachments.where({ prpId: id }).delete();
        
        // Delete PRP
        await trx.prps.where({ id }).delete();
      });
      
      // Remove from search index
      await searchService.removePRP(id);
      
    } else {
      // Soft delete
      await db.prps.update(
        { id },
        {
          deletedAt: new Date(),
          deletedBy: req.user.id,
          status: 'deleted'
        }
      );
      
      // Record in history
      await db.prpHistory.create({
        prpId: id,
        action: 'deleted',
        userId: req.user.id,
        timestamp: new Date()
      });
    }
    
    // Emit event
    eventEmitter.emit('prp.deleted', {
      prpId: id,
      userId: req.user.id,
      permanent: permanent === 'true'
    });
    
    res.status(204).send();
    
  } catch (error) {
    logger.error('Delete PRP error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to delete PRP'
    });
  }
}
```

## Advanced Query Patterns

### Full-Text Search

```typescript
// PostgreSQL full-text search
async function searchPRPs(req: Request, res: Response) {
  const { q, fields = 'name,description', limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({
      code: 'MISSING_QUERY',
      message: 'Search query is required'
    });
  }
  
  // Build search query
  const searchFields = (fields as string).split(',');
  const tsQuery = db.raw('plainto_tsquery(?)', [q]);
  
  let query = db.prps
    .select('*')
    .select(db.raw(
      'ts_rank(to_tsvector(name || \' \' || description), ?) as rank',
      [tsQuery]
    ));
  
  // Add search conditions
  if (searchFields.includes('name')) {
    query = query.orWhereRaw(
      'to_tsvector(name) @@ ?',
      [tsQuery]
    );
  }
  
  if (searchFields.includes('description')) {
    query = query.orWhereRaw(
      'to_tsvector(description) @@ ?',
      [tsQuery]
    );
  }
  
  // Order by relevance
  const results = await query
    .orderBy('rank', 'desc')
    .limit(parseInt(limit as string));
  
  // Highlight matches
  const highlighted = results.map(prp => ({
    ...prp,
    highlights: {
      name: highlightMatches(prp.name, q as string),
      description: highlightMatches(prp.description, q as string)
    }
  }));
  
  res.json({
    query: q,
    results: highlighted,
    total: highlighted.length
  });
}

// Elasticsearch implementation
class ElasticsearchService {
  private client: Client;
  
  async searchPRPs(query: string, options: SearchOptions) {
    const response = await this.client.search({
      index: 'prps',
      body: {
        query: {
          multi_match: {
            query,
            fields: ['name^2', 'description', 'requirements'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        },
        highlight: {
          fields: {
            name: {},
            description: { fragment_size: 150 }
          }
        },
        aggs: {
          by_status: {
            terms: { field: 'status' }
          },
          by_priority: {
            terms: { field: 'priority' }
          }
        },
        size: options.limit || 20,
        from: options.offset || 0
      }
    });
    
    return {
      hits: response.body.hits.hits.map(hit => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight
      })),
      total: response.body.hits.total.value,
      aggregations: response.body.aggregations
    };
  }
}
```

### Aggregations and Analytics

```typescript
// Get PRP statistics
async function getPRPStats(req: Request, res: Response) {
  const { projectId, dateRange = '30d' } = req.query;
  
  // Calculate date range
  const startDate = getStartDate(dateRange as string);
  
  // Build base query
  let query = db.prps;
  
  if (projectId) {
    query = query.where({ projectId });
  }
  
  // Get aggregated stats
  const stats = await db.prps
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as pending', ['pending']),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as active', ['active']),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['completed']),
      db.raw('AVG(estimated_hours) as avg_estimated_hours'),
      db.raw('AVG(actual_hours) as avg_actual_hours'),
      db.raw('SUM(estimated_hours) as total_estimated_hours'),
      db.raw('SUM(actual_hours) as total_actual_hours')
    )
    .where('created_at', '>=', startDate)
    .first();
  
  // Get completion rate by priority
  const byPriority = await db.prps
    .select('priority')
    .select(db.raw('COUNT(*) as total'))
    .select(db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['completed']))
    .where('created_at', '>=', startDate)
    .groupBy('priority');
  
  // Get trend data
  const trend = await db.prps
    .select(db.raw('DATE_TRUNC(?, created_at) as date', ['day']))
    .select(db.raw('COUNT(*) as count'))
    .where('created_at', '>=', startDate)
    .groupBy(db.raw('DATE_TRUNC(?, created_at)', ['day']))
    .orderBy('date');
  
  res.json({
    summary: stats,
    byPriority: byPriority.map(p => ({
      ...p,
      completionRate: p.total > 0 ? (p.completed / p.total) * 100 : 0
    })),
    trend,
    dateRange: {
      start: startDate,
      end: new Date()
    }
  });
}
```

## Batch Operations

### Batch Create

```typescript
async function batchCreatePRPs(req: Request, res: Response) {
  const { prps } = req.body;
  
  // Validate array
  if (!Array.isArray(prps) || prps.length === 0) {
    return res.status(400).json({
      code: 'INVALID_BATCH',
      message: 'PRPs array is required'
    });
  }
  
  // Limit batch size
  if (prps.length > 100) {
    return res.status(400).json({
      code: 'BATCH_TOO_LARGE',
      message: 'Maximum 100 PRPs per batch'
    });
  }
  
  // Validate each PRP
  const validated = [];
  const errors = [];
  
  for (let i = 0; i < prps.length; i++) {
    try {
      const validPrp = createPRPSchema.parse(prps[i]);
      validated.push({ ...validPrp, _index: i });
    } catch (error) {
      errors.push({
        index: i,
        errors: error.errors
      });
    }
  }
  
  if (errors.length > 0) {
    return res.status(422).json({
      code: 'BATCH_VALIDATION_ERROR',
      message: 'Some PRPs failed validation',
      errors
    });
  }
  
  // Create PRPs in transaction
  const created = await db.transaction(async (trx) => {
    const results = [];
    
    for (const prpData of validated) {
      const { _index, ...data } = prpData;
      
      const prp = await trx.prps.create({
        id: generateId('prp'),
        ...data,
        status: 'pending',
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning('*');
      
      results.push(prp);
    }
    
    return results;
  });
  
  res.status(201).json({
    created: created.length,
    prps: created.map(prp => serializePRP(prp))
  });
}
```

### Batch Update

```typescript
async function batchUpdatePRPs(req: Request, res: Response) {
  const { updates } = req.body;
  
  // Validate updates array
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      code: 'INVALID_BATCH',
      message: 'Updates array is required'
    });
  }
  
  const results = {
    updated: [],
    errors: []
  };
  
  // Process updates in transaction
  await db.transaction(async (trx) => {
    for (const update of updates) {
      try {
        const { id, ...data } = update;
        
        // Validate update data
        const validated = updatePRPSchema.partial().parse(data);
        
        // Check if PRP exists and user has access
        const existing = await trx.prps.findById(id);
        
        if (!existing) {
          results.errors.push({
            id,
            error: 'NOT_FOUND'
          });
          continue;
        }
        
        if (!await canUpdatePRP(req.user, existing)) {
          results.errors.push({
            id,
            error: 'FORBIDDEN'
          });
          continue;
        }
        
        // Update PRP
        const updated = await trx.prps.update(
          { id },
          {
            ...validated,
            updatedAt: new Date(),
            updatedBy: req.user.id
          }
        ).returning('*');
        
        results.updated.push(updated[0]);
        
      } catch (error) {
        results.errors.push({
          id: update.id,
          error: error.message
        });
      }
    }
  });
  
  res.json({
    updated: results.updated.length,
    errors: results.errors.length,
    results
  });
}
```

### Batch Delete

```typescript
async function batchDeletePRPs(req: Request, res: Response) {
  const { ids, permanent = false } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      code: 'INVALID_BATCH',
      message: 'IDs array is required'
    });
  }
  
  if (ids.length > 100) {
    return res.status(400).json({
      code: 'BATCH_TOO_LARGE',
      message: 'Maximum 100 deletions per batch'
    });
  }
  
  const results = {
    deleted: [],
    errors: []
  };
  
  await db.transaction(async (trx) => {
    for (const id of ids) {
      try {
        const prp = await trx.prps.findById(id);
        
        if (!prp) {
          results.errors.push({
            id,
            error: 'NOT_FOUND'
          });
          continue;
        }
        
        if (!await canDeletePRP(req.user, prp)) {
          results.errors.push({
            id,
            error: 'FORBIDDEN'
          });
          continue;
        }
        
        if (permanent && req.user.role === 'admin') {
          await trx.prps.where({ id }).delete();
        } else {
          await trx.prps.update(
            { id },
            {
              deletedAt: new Date(),
              deletedBy: req.user.id,
              status: 'deleted'
            }
          );
        }
        
        results.deleted.push(id);
        
      } catch (error) {
        results.errors.push({
          id,
          error: error.message
        });
      }
    }
  });
  
  res.json({
    deleted: results.deleted.length,
    errors: results.errors.length,
    results
  });
}
```

## Soft Delete Pattern

```typescript
// Soft delete implementation
interface SoftDeletable {
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

// Base repository with soft delete support
class BaseRepository<T extends SoftDeletable> {
  constructor(private tableName: string) {}
  
  // Override default queries to exclude soft deleted
  async find(conditions: any = {}) {
    return db(this.tableName)
      .where(conditions)
      .whereNull('deletedAt');
  }
  
  async findWithDeleted(conditions: any = {}) {
    return db(this.tableName).where(conditions);
  }
  
  async findOnlyDeleted(conditions: any = {}) {
    return db(this.tableName)
      .where(conditions)
      .whereNotNull('deletedAt');
  }
  
  async softDelete(id: string, userId: string) {
    return db(this.tableName)
      .where({ id })
      .update({
        deletedAt: new Date(),
        deletedBy: userId
      });
  }
  
  async restore(id: string) {
    return db(this.tableName)
      .where({ id })
      .update({
        deletedAt: null,
        deletedBy: null
      });
  }
  
  async hardDelete(id: string) {
    return db(this.tableName)
      .where({ id })
      .delete();
  }
}

// Restore endpoint
async function restorePRP(req: Request, res: Response) {
  const { id } = req.params;
  
  const prp = await db.prps
    .where({ id })
    .whereNotNull('deletedAt')
    .first();
  
  if (!prp) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Deleted PRP not found'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Only admins can restore deleted PRPs'
    });
  }
  
  await db.prps.update(
    { id },
    {
      deletedAt: null,
      deletedBy: null,
      status: 'pending'
    }
  );
  
  res.json({ message: 'PRP restored successfully' });
}
```

## Optimistic Locking

```typescript
// Version-based optimistic locking
interface Versioned {
  version: number;
}

// Update with version check
async function updatePRPWithLocking(req: Request, res: Response) {
  const { id } = req.params;
  const { version, ...updates } = req.body;
  
  if (typeof version !== 'number') {
    return res.status(400).json({
      code: 'MISSING_VERSION',
      message: 'Version is required for updates'
    });
  }
  
  try {
    const result = await db.prps
      .where({ id, version })
      .update({
        ...updates,
        version: version + 1,
        updatedAt: new Date()
      })
      .returning('*');
    
    if (result.length === 0) {
      // Check if PRP exists
      const exists = await db.prps.where({ id }).first();
      
      if (!exists) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'PRP not found'
        });
      }
      
      return res.status(409).json({
        code: 'VERSION_CONFLICT',
        message: 'PRP has been modified by another user',
        currentVersion: exists.version
      });
    }
    
    res.json(result[0]);
    
  } catch (error) {
    handleError(error, res);
  }
}

// ETag-based optimistic locking
async function updatePRPWithETag(req: Request, res: Response) {
  const { id } = req.params;
  const ifMatch = req.get('If-Match');
  
  if (!ifMatch) {
    return res.status(428).json({
      code: 'PRECONDITION_REQUIRED',
      message: 'If-Match header is required'
    });
  }
  
  const prp = await db.prps.findById(id);
  
  if (!prp) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'PRP not found'
    });
  }
  
  const currentETag = generateETag(prp);
  
  if (ifMatch !== currentETag) {
    return res.status(412).json({
      code: 'PRECONDITION_FAILED',
      message: 'PRP has been modified',
      currentETag
    });
  }
  
  // Proceed with update
  const updated = await db.prps.update(
    { id },
    {
      ...req.body,
      updatedAt: new Date()
    }
  ).returning('*');
  
  const newETag = generateETag(updated[0]);
  res.set('ETag', newETag);
  res.json(updated[0]);
}
```

## Audit Trail

```typescript
// Comprehensive audit logging
interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  changes?: any;
  metadata?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

class AuditService {
  async logChange(params: {
    entity: string;
    entityId: string;
    action: string;
    user: User;
    changes?: any;
    request: Request;
  }) {
    const log: AuditLog = {
      id: generateId('audit'),
      entityType: params.entity,
      entityId: params.entityId,
      action: params.action,
      userId: params.user.id,
      userEmail: params.user.email,
      userRole: params.user.role,
      changes: params.changes,
      metadata: {
        method: params.request.method,
        path: params.request.path,
        query: params.request.query
      },
      ipAddress: params.request.ip,
      userAgent: params.request.get('user-agent') || '',
      timestamp: new Date()
    };
    
    await db.auditLogs.create(log);
    
    // Also send to external audit service if configured
    if (process.env.AUDIT_SERVICE_URL) {
      await this.sendToAuditService(log);
    }
  }
  
  async getAuditTrail(entityType: string, entityId: string) {
    return db.auditLogs
      .where({ entityType, entityId })
      .orderBy('timestamp', 'desc');
  }
  
  private calculateChanges(before: any, after: any): any {
    const changes = {};
    
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key]
        };
      }
    }
    
    return changes;
  }
}

// Audit middleware
const auditService = new AuditService();

function auditMiddleware(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capture response
    res.json = function(data: any) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };
    
    res.send = function(data: any) {
      res.locals.responseData = data;
      return originalSend.call(this, data);
    };
    
    // Continue with request
    next();
    
    // Log after response
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await auditService.logChange({
          entity: 'prp',
          entityId: req.params.id || res.locals.responseData?.id,
          action,
          user: req.user,
          changes: res.locals.changes,
          request: req
        });
      }
    });
  };
}

// Apply audit middleware
router.post('/prps', auditMiddleware('create'), createPRP);
router.put('/prps/:id', auditMiddleware('update'), updatePRP);
router.delete('/prps/:id', auditMiddleware('delete'), deletePRP);
```

## Performance Optimization

### Database Indexing

```sql
-- Essential indexes for PRP table
CREATE INDEX idx_prps_project_id ON prps(project_id);
CREATE INDEX idx_prps_status ON prps(status);
CREATE INDEX idx_prps_priority ON prps(priority);
CREATE INDEX idx_prps_created_at ON prps(created_at DESC);
CREATE INDEX idx_prps_updated_at ON prps(updated_at DESC);
CREATE INDEX idx_prps_assigned_to ON prps(assigned_to);
CREATE INDEX idx_prps_deleted_at ON prps(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX idx_prps_project_status ON prps(project_id, status);
CREATE INDEX idx_prps_status_priority ON prps(status, priority);

-- Full-text search indexes
CREATE INDEX idx_prps_name_gin ON prps USING gin(to_tsvector('english', name));
CREATE INDEX idx_prps_description_gin ON prps USING gin(to_tsvector('english', description));

-- JSONB indexes for tags and metadata
CREATE INDEX idx_prps_tags ON prps USING gin(tags);
CREATE INDEX idx_prps_metadata ON prps USING gin(metadata);
```

### Query Optimization

```typescript
// Use database views for complex queries
const createPRPView = `
  CREATE OR REPLACE VIEW prp_summary AS
  SELECT 
    p.*,
    proj.name as project_name,
    u1.name as created_by_name,
    u2.name as assigned_to_name,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT a.id) as attachment_count,
    COALESCE(h.last_updated, p.created_at) as last_activity
  FROM prps p
  LEFT JOIN projects proj ON p.project_id = proj.id
  LEFT JOIN users u1 ON p.created_by = u1.id
  LEFT JOIN users u2 ON p.assigned_to = u2.id
  LEFT JOIN prp_comments c ON p.id = c.prp_id
  LEFT JOIN prp_attachments a ON p.id = a.prp_id
  LEFT JOIN LATERAL (
    SELECT MAX(timestamp) as last_updated
    FROM prp_history
    WHERE prp_id = p.id
  ) h ON true
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, proj.name, u1.name, u2.name, h.last_updated;
`;

// Use the view for efficient queries
async function getPRPSummaries(filters: any) {
  return db('prp_summary')
    .where(filters)
    .orderBy('last_activity', 'desc');
}
```

### Caching Strategy

```typescript
// Redis caching layer
class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl?: number) {
    await this.redis.setex(
      key,
      ttl || this.defaultTTL,
      JSON.stringify(value)
    );
  }
  
  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Cache middleware
function cacheable(keyGenerator: (req: Request) => string, ttl?: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const cached = await cache.get(key);
    
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Capture response for caching
    const originalJson = res.json;
    res.json = function(data: any) {
      res.set('X-Cache', 'MISS');
      
      // Cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Apply caching
router.get('/prps', 
  cacheable(req => `prps:${JSON.stringify(req.query)}`, 60),
  listPRPs
);

router.get('/prps/:id',
  cacheable(req => `prp:${req.params.id}`, 300),
  getPRP
);

// Invalidate cache on updates
eventEmitter.on('prp.updated', ({ prp }) => {
  cache.invalidate(`prp:${prp.id}`);
  cache.invalidate('prps:*');
});
```

### Response Pagination Optimization

```typescript
// Cursor-based pagination for large datasets
interface CursorPagination {
  cursor?: string;
  limit: number;
  direction: 'next' | 'prev';
}

async function listPRPsWithCursor(req: Request, res: Response) {
  const { cursor, limit = 20, direction = 'next' } = req.query;
  
  let query = db.prps.where({ deleted_at: null });
  
  // Decode cursor
  if (cursor) {
    const decoded = decodeCursor(cursor);
    
    if (direction === 'next') {
      query = query.where('created_at', '<', decoded.timestamp)
        .orWhere(function() {
          this.where('created_at', '=', decoded.timestamp)
            .where('id', '>', decoded.id);
        });
    } else {
      query = query.where('created_at', '>', decoded.timestamp)
        .orWhere(function() {
          this.where('created_at', '=', decoded.timestamp)
            .where('id', '<', decoded.id);
        });
    }
  }
  
  // Get results
  const results = await query
    .orderBy('created_at', direction === 'next' ? 'desc' : 'asc')
    .orderBy('id', direction === 'next' ? 'asc' : 'desc')
    .limit(limit + 1);
  
  // Check if there are more results
  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop();
  }
  
  // Generate cursors
  const nextCursor = hasMore && results.length > 0
    ? encodeCursor({
        timestamp: results[results.length - 1].created_at,
        id: results[results.length - 1].id
      })
    : null;
  
  const prevCursor = cursor && results.length > 0
    ? encodeCursor({
        timestamp: results[0].created_at,
        id: results[0].id
      })
    : null;
  
  res.json({
    data: results,
    pagination: {
      cursor: {
        next: nextCursor,
        prev: prevCursor
      },
      hasNext: hasMore,
      hasPrev: !!cursor
    }
  });
}

function encodeCursor(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): any {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}
```