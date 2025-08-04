import { Client, createClient } from '@libsql/client';
import { EventEmitter } from 'events';

/**
 * Turso Edge Network
 * Gerencia conexões distribuídas e sincronização entre regiões
 */
export class TursoEdgeNetwork extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private primaryClient: Client;
  private latencyMap: Map<string, number> = new Map();
  private syncInProgress: boolean = false;

  constructor(private config: TursoEdgeConfig) {
    super();
    this.validateConfig();
  }

  /**
   * Inicializar rede edge
   */
  async initialize(): Promise<void> {
    console.log('🌐 Inicializando Turso Edge Network...');
    
    // Conectar ao banco primário
    this.primaryClient = createClient({
      url: this.config.primary,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
    
    // Conectar às réplicas
    for (const replicaUrl of this.config.replicas) {
      const region = this.extractRegion(replicaUrl);
      const client = createClient({
        url: replicaUrl,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      
      this.clients.set(region, client);
    }
    
    // Medir latências iniciais
    await this.measureLatencies();
    
    // Configurar sincronização CRDT
    if (this.config.syncStrategy === 'crdt') {
      await this.setupCRDTSync();
    }
    
    // Iniciar monitoramento
    this.startMonitoring();
    
    console.log('✓ Turso Edge Network inicializada com', this.clients.size, 'regiões');
  }

  /**
   * Executar query na região mais próxima
   */
  async execute(
    query: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<any> {
    const client = this.selectOptimalClient(options);
    const startTime = Date.now();
    
    try {
      const result = await client.execute({
        sql: query,
        args: params
      });
      
      const latency = Date.now() - startTime;
      this.recordLatency(options.region || 'auto', latency);
      
      return result;
      
    } catch (error) {
      console.error('Erro na query:', error);
      
      // Fallback para primário em caso de erro
      if (client !== this.primaryClient) {
        console.log('Fallback para banco primário...');
        return this.primaryClient.execute({ sql: query, args: params });
      }
      
      throw error;
    }
  }

  /**
   * Executar transação distribuída
   */
  async transaction(
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<void> {
    const client = options.primary ? this.primaryClient : this.selectOptimalClient(options);
    
    try {
      await client.transaction(async (tx) => {
        for (const op of operations) {
          await tx.execute({
            sql: op.query,
            args: op.params || []
          });
        }
      });
      
      // Propagar para outras regiões se necessário
      if (options.propagate !== false) {
        await this.propagateTransaction(operations, options);
      }
      
    } catch (error) {
      console.error('Erro na transação:', error);
      throw error;
    }
  }

  /**
   * Medir latências para todas as regiões
   */
  async measureLatencies(): Promise<Record<string, number>> {
    const latencies: Record<string, number> = {};
    
    // Medir latência do primário
    const primaryLatency = await this.measureClientLatency(this.primaryClient);
    latencies['primary'] = primaryLatency;
    this.latencyMap.set('primary', primaryLatency);
    
    // Medir latência das réplicas
    for (const [region, client] of this.clients) {
      const latency = await this.measureClientLatency(client);
      latencies[region] = latency;
      this.latencyMap.set(region, latency);
    }
    
    return latencies;
  }

  /**
   * Medir latência de um cliente específico
   */
  private async measureClientLatency(client: Client): Promise<number> {
    const iterations = 3;
    let totalLatency = 0;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await client.execute('SELECT 1');
      totalLatency += Date.now() - start;
    }
    
    return Math.round(totalLatency / iterations);
  }

  /**
   * Selecionar cliente optimal baseado em latência
   */
  private selectOptimalClient(options: QueryOptions): Client {
    // Se região específica foi solicitada
    if (options.region) {
      const client = this.clients.get(options.region);
      if (client) return client;
    }
    
    // Se é operação de escrita, usar primário
    if (options.write) {
      return this.primaryClient;
    }
    
    // Para leitura, escolher região com menor latência
    let lowestLatency = Infinity;
    let optimalClient = this.primaryClient;
    
    for (const [region, latency] of this.latencyMap) {
      if (latency < lowestLatency && latency < this.config.maxLatency) {
        lowestLatency = latency;
        optimalClient = region === 'primary' 
          ? this.primaryClient 
          : this.clients.get(region) || this.primaryClient;
      }
    }
    
    return optimalClient;
  }

  /**
   * Setup CRDT synchronization
   */
  private async setupCRDTSync(): Promise<void> {
    console.log('🔄 Configurando sincronização CRDT...');
    
    // Criar tabela de vector clocks se não existir
    await this.primaryClient.execute(`
      CREATE TABLE IF NOT EXISTS crdt_vector_clocks (
        node_id TEXT PRIMARY KEY,
        clock INTEGER DEFAULT 0,
        last_update INTEGER DEFAULT 0
      )
    `);
    
    // Criar tabela de operações CRDT
    await this.primaryClient.execute(`
      CREATE TABLE IF NOT EXISTS crdt_operations (
        id TEXT PRIMARY KEY,
        node_id TEXT,
        operation_type TEXT,
        entity_type TEXT,
        entity_id TEXT,
        data TEXT,
        vector_clock TEXT,
        timestamp INTEGER,
        applied BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Iniciar processo de sincronização
    this.startCRDTSync();
  }

  /**
   * Iniciar sincronização CRDT
   */
  private startCRDTSync(): void {
    setInterval(async () => {
      if (this.syncInProgress) return;
      
      this.syncInProgress = true;
      
      try {
        await this.syncCRDTOperations();
      } catch (error) {
        console.error('Erro na sincronização CRDT:', error);
      } finally {
        this.syncInProgress = false;
      }
    }, 5000); // Sincronizar a cada 5 segundos
  }

  /**
   * Sincronizar operações CRDT
   */
  private async syncCRDTOperations(): Promise<void> {
    // Buscar operações não aplicadas
    const pendingOps = await this.primaryClient.execute(`
      SELECT * FROM crdt_operations 
      WHERE applied = FALSE 
      ORDER BY timestamp ASC 
      LIMIT 100
    `);
    
    if (pendingOps.rows.length === 0) return;
    
    // Aplicar operações em ordem
    for (const op of pendingOps.rows) {
      await this.applyCRDTOperation(op);
    }
    
    // Marcar operações como aplicadas
    const opIds = pendingOps.rows.map(op => op.id);
    await this.primaryClient.execute({
      sql: `UPDATE crdt_operations SET applied = TRUE WHERE id IN (${opIds.map(() => '?').join(',')})`,
      args: opIds
    });
  }

  /**
   * Aplicar operação CRDT
   */
  private async applyCRDTOperation(operation: any): Promise<void> {
    const data = JSON.parse(operation.data as string);
    
    switch (operation.operation_type) {
      case 'increment':
        await this.applyIncrement(operation.entity_type, operation.entity_id, data);
        break;
      
      case 'add_to_set':
        await this.applyAddToSet(operation.entity_type, operation.entity_id, data);
        break;
      
      case 'update_lww':
        await this.applyLastWriterWins(operation.entity_type, operation.entity_id, data);
        break;
      
      default:
        console.warn('Tipo de operação CRDT desconhecido:', operation.operation_type);
    }
  }

  /**
   * Aplicar incremento CRDT
   */
  private async applyIncrement(
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    await this.primaryClient.execute({
      sql: `UPDATE ${entityType} SET ${data.field} = ${data.field} + ? WHERE id = ?`,
      args: [data.delta, entityId]
    });
  }

  /**
   * Aplicar adição a conjunto CRDT
   */
  private async applyAddToSet(
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    // Implementação específica para sets
    // Por exemplo, adicionar item a uma lista de tags
  }

  /**
   * Aplicar Last Writer Wins
   */
  private async applyLastWriterWins(
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    // Verificar timestamp antes de aplicar
    const current = await this.primaryClient.execute({
      sql: `SELECT last_modified FROM ${entityType} WHERE id = ?`,
      args: [entityId]
    });
    
    if (current.rows.length === 0 || data.timestamp > current.rows[0].last_modified) {
      await this.primaryClient.execute({
        sql: `UPDATE ${entityType} SET data = ?, last_modified = ? WHERE id = ?`,
        args: [JSON.stringify(data.value), data.timestamp, entityId]
      });
    }
  }

  /**
   * Propagar transação para outras regiões
   */
  private async propagateTransaction(
    operations: TransactionOperation[],
    options: TransactionOptions
  ): Promise<void> {
    const propagationPromises = [];
    
    for (const [region, client] of this.clients) {
      if (options.excludeRegions?.includes(region)) continue;
      
      const promise = client.transaction(async (tx) => {
        for (const op of operations) {
          await tx.execute({
            sql: op.query,
            args: op.params || []
          });
        }
      }).catch(error => {
        console.error(`Erro ao propagar para ${region}:`, error);
      });
      
      propagationPromises.push(promise);
    }
    
    await Promise.all(propagationPromises);
  }

  /**
   * Propagar dados específicos
   */
  async propagate(data: PropagationData): Promise<void> {
    const targetClient = this.clients.get(data.targetRegion);
    if (!targetClient) {
      throw new Error(`Região não encontrada: ${data.targetRegion}`);
    }
    
    // Adicionar à fila de propagação
    await this.primaryClient.execute({
      sql: `INSERT INTO propagation_queue (type, data, target_region, priority, created_at) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        data.type,
        JSON.stringify(data.data),
        data.targetRegion,
        data.priority || 'normal',
        Date.now()
      ]
    });
    
    // Processar fila imediatamente se alta prioridade
    if (data.priority === 'high') {
      await this.processPropagationQueue();
    }
  }

  /**
   * Processar fila de propagação
   */
  private async processPropagationQueue(): Promise<void> {
    const items = await this.primaryClient.execute(`
      SELECT * FROM propagation_queue 
      WHERE processed = FALSE 
      ORDER BY priority DESC, created_at ASC 
      LIMIT 50
    `);
    
    for (const item of items.rows) {
      try {
        await this.propagateItem(item);
        
        // Marcar como processado
        await this.primaryClient.execute({
          sql: 'UPDATE propagation_queue SET processed = TRUE WHERE id = ?',
          args: [item.id]
        });
      } catch (error) {
        console.error('Erro ao propagar item:', error);
      }
    }
  }

  /**
   * Propagar item individual
   */
  private async propagateItem(item: any): Promise<void> {
    const data = JSON.parse(item.data as string);
    const client = this.clients.get(item.target_region as string);
    
    if (!client) return;
    
    switch (item.type) {
      case 'order_sync':
        await this.syncOrder(client, data);
        break;
      
      case 'inventory_update':
        await this.syncInventory(client, data);
        break;
      
      default:
        console.warn('Tipo de propagação desconhecido:', item.type);
    }
  }

  /**
   * Sincronizar pedido
   */
  private async syncOrder(client: Client, order: any): Promise<void> {
    await client.execute({
      sql: `INSERT OR REPLACE INTO orders (id, user_id, items, total, status, region, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        order.id,
        order.userId,
        JSON.stringify(order.items),
        order.total,
        order.status,
        order.region,
        order.createdAt
      ]
    });
  }

  /**
   * Sincronizar inventário
   */
  private async syncInventory(client: Client, inventory: any): Promise<void> {
    await client.execute({
      sql: `UPDATE inventory SET stock = ?, last_update = ? WHERE product_id = ?`,
      args: [inventory.stock, Date.now(), inventory.productId]
    });
  }

  /**
   * Iniciar monitoramento
   */
  private startMonitoring(): void {
    // Monitorar latências periodicamente
    setInterval(async () => {
      await this.measureLatencies();
    }, 60000); // A cada minuto
    
    // Monitorar health
    setInterval(async () => {
      await this.checkHealth();
    }, 30000); // A cada 30 segundos
  }

  /**
   * Verificar saúde do sistema
   */
  private async checkHealth(): Promise<void> {
    const unhealthyRegions = [];
    
    for (const [region, client] of this.clients) {
      try {
        await client.execute('SELECT 1');
      } catch (error) {
        unhealthyRegions.push(region);
      }
    }
    
    if (unhealthyRegions.length > 0) {
      this.emit('unhealthy', unhealthyRegions);
    }
  }

  /**
   * Extrair região da URL
   */
  private extractRegion(url: string): string {
    // Extrair região da URL (ex: us-east-1, eu-west-1)
    const match = url.match(/\/\/([^.]+)\./);
    return match ? match[1] : 'unknown';
  }

  /**
   * Validar configuração
   */
  private validateConfig(): void {
    if (!this.config.primary) {
      throw new Error('URL do banco primário é obrigatória');
    }
    
    if (!this.config.replicas || this.config.replicas.length === 0) {
      throw new Error('Pelo menos uma réplica é necessária');
    }
  }

  /**
   * Registrar latência
   */
  private recordLatency(region: string, latency: number): void {
    // Atualizar média móvel
    const current = this.latencyMap.get(region) || latency;
    const newLatency = (current * 0.7) + (latency * 0.3); // Média móvel exponencial
    this.latencyMap.set(region, newLatency);
  }

  /**
   * Obter métricas
   */
  async getMetrics(): Promise<TursoMetrics> {
    const latencies = Object.fromEntries(this.latencyMap);
    const avgLatency = Array.from(this.latencyMap.values())
      .reduce((a, b) => a + b, 0) / this.latencyMap.size;
    
    return {
      regions: this.clients.size + 1,
      latencies,
      avgLatency: Math.round(avgLatency),
      syncStatus: this.syncInProgress ? 'syncing' : 'idle',
      healthy: true
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.primaryClient.execute('SELECT 1');
      return { healthy: true, name: 'TursoEdgeNetwork' };
    } catch (error) {
      return { healthy: false, name: 'TursoEdgeNetwork', error: error.message };
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Turso Edge Network...');
    // Cleanup
  }
}

// Interfaces
interface TursoEdgeConfig {
  primary: string;
  replicas: string[];
  syncStrategy?: 'crdt' | 'master-slave' | 'multi-master';
  consistency?: 'strong' | 'eventual';
  maxLatency: number;
}

interface QueryOptions {
  region?: string;
  write?: boolean;
}

interface TransactionOperation {
  query: string;
  params?: any[];
}

interface TransactionOptions {
  primary?: boolean;
  propagate?: boolean;
  excludeRegions?: string[];
}

interface PropagationData {
  type: string;
  data: any;
  targetRegion: string;
  priority?: 'low' | 'normal' | 'high';
}

interface TursoMetrics {
  regions: number;
  latencies: Record<string, number>;
  avgLatency: number;
  syncStatus: string;
  healthy: boolean;
}

interface HealthCheckResult {
  healthy: boolean;
  name: string;
  error?: string;
}

export { TursoEdgeNetwork, TursoEdgeConfig, QueryOptions, TransactionOptions };