/**
 * Cloud-only configuration for Turso MCP server
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define cloud-only configuration schema
export const CloudConfigSchema = z.object({
	// Mode selection (only cloud now)
	TURSO_MODE: z.enum(['cloud']).default('cloud'),
	
	// Cloud configuration (required)
	TURSO_API_TOKEN: z.string(),
	TURSO_ORGANIZATION: z.string(),
	TURSO_DEFAULT_DATABASE: z.string().default('context-memory'),
	
	// Token management settings
	TOKEN_EXPIRATION: z.string().default('7d'),
	TOKEN_PERMISSION: z.enum(['full-access', 'read-only']).default('full-access'),
});

export type CloudConfig = z.infer<typeof CloudConfigSchema>;

// Parse environment variables for cloud-only mode
export function load_cloud_config(): CloudConfig {
	try {
		const config = CloudConfigSchema.parse({
			TURSO_MODE: 'cloud',
			TURSO_API_TOKEN: process.env.TURSO_API_TOKEN,
			TURSO_ORGANIZATION: process.env.TURSO_ORGANIZATION,
			TURSO_DEFAULT_DATABASE: process.env.TURSO_DEFAULT_DATABASE || 'context-memory',
			TOKEN_EXPIRATION: process.env.TOKEN_EXPIRATION || '7d',
			TOKEN_PERMISSION: process.env.TOKEN_PERMISSION || 'full-access',
		});
		
		// Validate cloud credentials
		if (!config.TURSO_API_TOKEN || !config.TURSO_ORGANIZATION) {
			throw new Error('Cloud credentials required: TURSO_API_TOKEN and TURSO_ORGANIZATION');
		}
		
		return config;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missing = error.issues.map(i => i.path.join('.')).join(', ');
			throw new Error(`Configuration error: ${missing}`);
		}
		throw error;
	}
}

// Get cloud config singleton
let cloudConfig: CloudConfig | null = null;

export function get_cloud_config(): CloudConfig {
	if (!cloudConfig) {
		cloudConfig = load_cloud_config();
	}
	return cloudConfig;
}

// Legacy function names for compatibility
export function get_hybrid_config(): CloudConfig {
	return get_cloud_config();
}

// Always cloud mode now
export function is_local_mode(): boolean {
	return false;
}

export function is_cloud_mode(): boolean {
	return true;
}

export function is_hybrid_mode(): boolean {
	return false;
}