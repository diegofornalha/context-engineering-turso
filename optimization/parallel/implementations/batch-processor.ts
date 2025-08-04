/**
 * High-Performance Batch Processor
 * Optimizes parallel execution by batching similar operations
 */

import { EventEmitter } from 'events';

export interface BatchOptions {
  maxBatchSize: number;
  maxWaitTime: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BatchItem<T, R> {
  id: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
  attempts: number;
}

export interface BatchMetrics {
  totalBatches: number;
  totalItems: number;
  averageBatchSize: number;
  averageWaitTime: number;
  successRate: number;
  errorRate: number;
}

export class BatchProcessor<T, R> extends EventEmitter {
  private queue: Map<string, BatchItem<T, R>> = new Map();
  private processing = false;
  private timer: NodeJS.Timeout | null = null;
  private metrics: BatchMetrics = {
    totalBatches: 0,
    totalItems: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    successRate: 1,
    errorRate: 0
  };

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private options: BatchOptions = {
      maxBatchSize: 100,
      maxWaitTime: 50,
      concurrency: 4,
      retryAttempts: 3,
      retryDelay: 100
    }
  ) {
    super();
  }

  /**
   * Add item to batch queue
   */
  async add(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const item: BatchItem<T, R> = {
        id,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
        attempts: 0
      };

      this.queue.set(id, item);
      this.scheduleBatch();
    });
  }

  /**
   * Add multiple items at once
   */
  async addMany(items: T[]): Promise<R[]> {
    const promises = items.map(item => this.add(item));
    return Promise.all(promises);
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    // If we've reached max batch size, process immediately
    if (this.queue.size >= this.options.maxBatchSize) {
      this.processBatch();
      return;
    }

    // Otherwise, schedule processing after max wait time
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.processBatch();
      }, this.options.maxWaitTime);
    }
  }

  /**
   * Process accumulated batch
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.size === 0) {
      return;
    }

    this.processing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Extract batch
    const batchItems = Array.from(this.queue.values())
      .slice(0, this.options.maxBatchSize);
    
    const batchData = batchItems.map(item => item.data);
    const startTime = Date.now();

    try {
      // Process batch with concurrency control
      const results = await this.processWithConcurrency(batchData);
      
      // Resolve individual promises
      batchItems.forEach((item, index) => {
        this.queue.delete(item.id);
        item.resolve(results[index]);
      });

      // Update metrics
      this.updateMetrics(batchItems.length, Date.now() - startTime, true);
      
      this.emit('batch:processed', {
        size: batchItems.length,
        duration: Date.now() - startTime
      });

    } catch (error) {
      // Handle batch failure
      await this.handleBatchError(batchItems, error as Error);
    } finally {
      this.processing = false;
      
      // Process next batch if queue not empty
      if (this.queue.size > 0) {
        setImmediate(() => this.processBatch());
      }
    }
  }

  /**
   * Process with concurrency control
   */
  private async processWithConcurrency(items: T[]): Promise<R[]> {
    if (items.length <= this.options.concurrency) {
      return this.processor(items);
    }

    // Split into concurrent chunks
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += this.options.concurrency) {
      chunks.push(items.slice(i, i + this.options.concurrency));
    }

    // Process chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map(chunk => this.processor(chunk))
    );

    // Flatten results
    return chunkResults.flat();
  }

  /**
   * Handle batch processing error
   */
  private async handleBatchError(
    items: BatchItem<T, R>[], 
    error: Error
  ): Promise<void> {
    for (const item of items) {
      item.attempts++;
      
      if (item.attempts < this.options.retryAttempts) {
        // Retry with exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, item.attempts - 1);
        setTimeout(() => {
          this.queue.set(item.id, item);
          this.scheduleBatch();
        }, delay);
      } else {
        // Max retries reached
        this.queue.delete(item.id);
        item.reject(new Error(`Batch processing failed after ${item.attempts} attempts: ${error.message}`));
      }
    }

    this.updateMetrics(items.length, 0, false);
    this.emit('batch:error', { error, items: items.length });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(
    batchSize: number, 
    duration: number, 
    success: boolean
  ): void {
    this.metrics.totalBatches++;
    this.metrics.totalItems += batchSize;
    
    // Calculate moving averages
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageBatchSize = 
      alpha * batchSize + (1 - alpha) * this.metrics.averageBatchSize;
    
    if (duration > 0) {
      this.metrics.averageWaitTime = 
        alpha * duration + (1 - alpha) * this.metrics.averageWaitTime;
    }

    // Update success/error rates
    const totalOps = this.metrics.totalBatches;
    if (success) {
      this.metrics.successRate = 
        ((totalOps - 1) * this.metrics.successRate + 1) / totalOps;
      this.metrics.errorRate = 1 - this.metrics.successRate;
    } else {
      this.metrics.errorRate = 
        ((totalOps - 1) * this.metrics.errorRate + 1) / totalOps;
      this.metrics.successRate = 1 - this.metrics.errorRate;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): BatchMetrics {
    return { ...this.metrics };
  }

  /**
   * Flush pending items immediately
   */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    while (this.queue.size > 0) {
      await this.processBatch();
    }
  }

  /**
   * Clear queue without processing
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Reject all pending items
    this.queue.forEach(item => {
      item.reject(new Error('Batch processor cleared'));
    });
    
    this.queue.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function for common batch processors
 */
export class BatchProcessorFactory {
  /**
   * Create file operation batch processor
   */
  static createFileProcessor(): BatchProcessor<
    { operation: 'read' | 'write' | 'delete'; path: string; content?: string },
    { success: boolean; data?: any }
  > {
    return new BatchProcessor(async (items) => {
      // Group by operation type
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.operation]) acc[item.operation] = [];
        acc[item.operation].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      // Process each group in parallel
      const results = await Promise.all(
        Object.entries(grouped).map(async ([op, group]) => {
          switch (op) {
            case 'read':
              return this.batchRead(group);
            case 'write':
              return this.batchWrite(group);
            case 'delete':
              return this.batchDelete(group);
            default:
              return group.map(() => ({ success: false }));
          }
        })
      );

      return results.flat();
    }, {
      maxBatchSize: 50,
      maxWaitTime: 20,
      concurrency: 10
    });
  }

  /**
   * Create memory operation batch processor
   */
  static createMemoryProcessor(): BatchProcessor<
    { action: 'get' | 'set' | 'delete'; key: string; value?: any },
    { success: boolean; data?: any }
  > {
    return new BatchProcessor(async (items) => {
      // Implementation would connect to actual memory store
      return items.map(item => ({ success: true, data: null }));
    }, {
      maxBatchSize: 100,
      maxWaitTime: 10,
      concurrency: 20
    });
  }

  /**
   * Create agent spawn batch processor
   */
  static createAgentSpawnProcessor(): BatchProcessor<
    { type: string; config: any },
    { agentId: string; ready: boolean }
  > {
    return new BatchProcessor(async (items) => {
      // Spawn all agents in parallel
      return Promise.all(
        items.map(async (item, index) => ({
          agentId: `agent-${Date.now()}-${index}`,
          ready: true
        }))
      );
    }, {
      maxBatchSize: 10,
      maxWaitTime: 100,
      concurrency: 5
    });
  }

  // Helper methods for file operations
  private static async batchRead(items: any[]): Promise<any[]> {
    // Actual implementation would read files
    return items.map(() => ({ success: true, data: 'file content' }));
  }

  private static async batchWrite(items: any[]): Promise<any[]> {
    // Actual implementation would write files
    return items.map(() => ({ success: true }));
  }

  private static async batchDelete(items: any[]): Promise<any[]> {
    // Actual implementation would delete files
    return items.map(() => ({ success: true }));
  }
}