/**
 * Cloud-only database client for Turso databases
 */
import { createClient, type Client, type InStatement } from '@libsql/client';
import { get_cloud_config } from '../config-hybrid.js';
import type { DatabaseTool } from '../common/types.js';

export class CloudDatabaseClient {
	private cloud_client: Client | null = null;
	
	/**
	 * Get or create cloud database client
	 */
	private get_cloud_client(): Client {
		if (!this.cloud_client) {
			const config = get_cloud_config();
			this.cloud_client = createClient({
				url: `https://${config.TURSO_DEFAULT_DATABASE}-${config.TURSO_ORGANIZATION}.aws-us-east-1.turso.io`,
				authToken: config.TURSO_API_TOKEN,
			});
		}
		return this.cloud_client;
	}
	
	/**
	 * Execute a query (cloud only)
	 */
	async execute_query(query: string, database?: string): Promise<DatabaseTool> {
		const client = this.get_cloud_client();
		const result = await client.execute(query);
		
		return {
			rows: result.rows as Record<string, unknown>[],
			columns: result.columns || [],
			rowsAffected: result.rowsAffected || 0,
			lastInsertRowid: result.lastInsertRowid?.toString(),
		};
	}
	
	/**
	 * Execute a read-only query (safe for all operations)
	 */
	async execute_read_only_query(query: string, database?: string): Promise<DatabaseTool> {
		// Validate it's actually read-only
		const normalized = query.trim().toUpperCase();
		const allowed_starts = ['SELECT', 'PRAGMA', 'EXPLAIN', 'WITH'];
		
		if (!allowed_starts.some(start => normalized.startsWith(start))) {
			throw new Error('Query must be read-only (SELECT, PRAGMA, EXPLAIN, or WITH)');
		}
		
		return this.execute_query(query, database);
	}
	
	/**
	 * List databases (cloud only)
	 */
	async list_databases(): Promise<Array<{ name: string; regions?: string[] }>> {
		// For cloud mode, return the configured database
		const config = get_cloud_config();
		return [{
			name: config.TURSO_DEFAULT_DATABASE,
			regions: ['aws-us-east-1'],
		}];
	}
	
	/**
	 * Get database info
	 */
	async get_database_info(database: string): Promise<any> {
		const client = this.get_cloud_client();
		
		// Get table count
		const tables = await client.execute(`
			SELECT COUNT(*) as count 
			FROM sqlite_master 
			WHERE type='table' AND name NOT LIKE 'sqlite_%'
		`);
		
		// Get database size (approximate)
		const pages = await client.execute('PRAGMA page_count');
		const pageSize = await client.execute('PRAGMA page_size');
		
		const pageCount = Number(pages.rows[0]?.page_count || 0);
		const pageSizeBytes = Number(pageSize.rows[0]?.page_size || 0);
		const sizeBytes = pageCount * pageSizeBytes;
		
		return {
			name: database,
			tableCount: Number(tables.rows[0]?.count || 0),
			sizeBytes,
			sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
			region: 'aws-us-east-1',
			type: 'cloud',
		};
	}
	
	/**
	 * Close the client connection
	 */
	close(): void {
		if (this.cloud_client) {
			this.cloud_client.close();
			this.cloud_client = null;
		}
	}
}

// Legacy class name for compatibility
export class HybridDatabaseClient extends CloudDatabaseClient {
	// All functionality inherited from CloudDatabaseClient
}