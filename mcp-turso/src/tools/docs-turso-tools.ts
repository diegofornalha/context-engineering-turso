/**
 * Ferramentas MCP para trabalhar com a tabela docs_turso
 * Adaptado de handler.ts para focar em documentos ao invés de conversas
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as database_client from '../clients/database.js';
import { ResultSet } from '../common/types.js';
import {
	resolve_database_name,
	set_current_database,
} from './context.js';

/**
 * Registra as ferramentas específicas para docs_turso
 */
export function register_docs_turso_tools(server: Server): void {
	// Registra a lista de ferramentas disponíveis
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			// Ferramentas para docs_turso
			{
				name: 'turso_add_doc',
				description: 'Adiciona um novo documento na tabela docs_turso',
				inputSchema: {
					type: 'object',
					properties: {
						title: {
							type: 'string',
							description: 'Título do documento',
						},
						content: {
							type: 'string',
							description: 'Conteúdo do documento',
						},
						file_path: {
							type: 'string',
							description: 'Caminho do arquivo',
						},
						category: {
							type: 'string',
							description: 'Categoria do documento (opcional)',
						},
						cluster: {
							type: 'string',
							description: 'Cluster do documento (opcional)',
						},
						tags: {
							type: 'string',
							description: 'Tags em formato JSON (opcional)',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: ['title', 'content', 'file_path'],
				},
			},
			{
				name: 'turso_get_docs',
				description: 'Busca documentos da tabela docs_turso',
				inputSchema: {
					type: 'object',
					properties: {
						category: {
							type: 'string',
							description: 'Filtrar por categoria (opcional)',
						},
						cluster: {
							type: 'string',
							description: 'Filtrar por cluster (opcional)',
						},
						limit: {
							type: 'number',
							description: 'Número de documentos a retornar (opcional)',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: [],
				},
			},
			{
				name: 'turso_search_docs',
				description: 'Busca conteúdo nos documentos da tabela docs_turso',
				inputSchema: {
					type: 'object',
					properties: {
						query: {
							type: 'string',
							description: 'Termo de busca',
						},
						category: {
							type: 'string',
							description: 'Filtrar por categoria (opcional)',
						},
						limit: {
							type: 'number',
							description: 'Número de resultados (opcional)',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: ['query'],
				},
			},
			{
				name: 'turso_update_doc',
				description: 'Atualiza um documento existente na tabela docs_turso',
				inputSchema: {
					type: 'object',
					properties: {
						id: {
							type: 'number',
							description: 'ID do documento a atualizar',
						},
						title: {
							type: 'string',
							description: 'Novo título (opcional)',
						},
						content: {
							type: 'string',
							description: 'Novo conteúdo (opcional)',
						},
						category: {
							type: 'string',
							description: 'Nova categoria (opcional)',
						},
						cluster: {
							type: 'string',
							description: 'Novo cluster (opcional)',
						},
						tags: {
							type: 'string',
							description: 'Novas tags em formato JSON (opcional)',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: ['id'],
				},
			},
			{
				name: 'turso_delete_doc',
				description: 'Remove um documento da tabela docs_turso',
				inputSchema: {
					type: 'object',
					properties: {
						id: {
							type: 'number',
							description: 'ID do documento a remover',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: ['id'],
				},
			},
			{
				name: 'turso_get_doc_by_path',
				description: 'Busca um documento específico pelo file_path',
				inputSchema: {
					type: 'object',
					properties: {
						file_path: {
							type: 'string',
							description: 'Caminho do arquivo a buscar',
						},
						database: {
							type: 'string',
							description: 'Nome do banco de dados (opcional, usa contexto se não fornecido)',
						},
					},
					required: ['file_path'],
				},
			},
		],
	}));

	// Registra o handler das ferramentas
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		try {
			// turso_add_doc
			if (request.params.name === 'turso_add_doc') {
				const {
					title,
					content,
					file_path,
					category = 'general',
					cluster = '01-getting-started',
					tags,
					database,
				} = request.params.arguments as {
					title: string;
					content: string;
					file_path: string;
					category?: string;
					cluster?: string;
					tags?: string;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				const insert_query = `
					INSERT INTO docs_turso (title, content, file_path, category, cluster, tags)
					VALUES (:title, :content, :file_path, :category, :cluster, :tags)
				`;

				const params = {
					':title': title,
					':content': content,
					':file_path': file_path,
					':category': category,
					':cluster': cluster,
					':tags': tags || null,
				};

				const result = await database_client.execute_query(
					database_name,
					insert_query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									database: database_name,
									doc_id: result.lastInsertRowid,
									message: 'Documento adicionado com sucesso',
								},
								null,
								2,
							),
						},
					],
				};
			}

			// turso_get_docs
			if (request.params.name === 'turso_get_docs') {
				const {
					category,
					cluster,
					limit = 10,
					database,
				} = request.params.arguments as {
					category?: string;
					cluster?: string;
					limit?: number;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				let query = 'SELECT * FROM docs_turso WHERE 1=1';
				const params: Record<string, any> = {};

				if (category) {
					query += ' AND category = :category';
					params[':category'] = category;
				}

				if (cluster) {
					query += ' AND cluster = :cluster';
					params[':cluster'] = cluster;
				}

				query += ' ORDER BY updated_at DESC';

				if (limit) {
					query += ' LIMIT :limit';
					params[':limit'] = limit;
				}

				const result = await database_client.execute_query(
					database_name,
					query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									database: database_name,
									documents: result.rows,
									total: result.rows.length,
								},
								null,
								2,
							),
						},
					],
				};
			}

			// turso_search_docs
			if (request.params.name === 'turso_search_docs') {
				const {
					query,
					category,
					limit = 10,
					database,
				} = request.params.arguments as {
					query: string;
					category?: string;
					limit?: number;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				let search_query = `
					SELECT * FROM docs_turso 
					WHERE (title LIKE :query1 OR content LIKE :query2)
				`;
				const params: Record<string, any> = {
					':query1': `%${query}%`,
					':query2': `%${query}%`,
				};

				if (category) {
					search_query += ' AND category = :category';
					params[':category'] = category;
				}

				search_query += ' ORDER BY priority DESC, updated_at DESC';

				if (limit) {
					search_query += ' LIMIT :limit';
					params[':limit'] = limit;
				}

				const result = await database_client.execute_query(
					database_name,
					search_query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									database: database_name,
									query,
									results: result.rows,
									total: result.rows.length,
								},
								null,
								2,
							),
						},
					],
				};
			}

			// turso_update_doc
			if (request.params.name === 'turso_update_doc') {
				const {
					id,
					title,
					content,
					category,
					cluster,
					tags,
					database,
				} = request.params.arguments as {
					id: number;
					title?: string;
					content?: string;
					category?: string;
					cluster?: string;
					tags?: string;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				// Constrói a query de update dinamicamente
				const updates: string[] = [];
				const params: Record<string, any> = { ':id': id };

				if (title !== undefined) {
					updates.push('title = :title');
					params[':title'] = title;
				}
				if (content !== undefined) {
					updates.push('content = :content');
					params[':content'] = content;
				}
				if (category !== undefined) {
					updates.push('category = :category');
					params[':category'] = category;
				}
				if (cluster !== undefined) {
					updates.push('cluster = :cluster');
					params[':cluster'] = cluster;
				}
				if (tags !== undefined) {
					updates.push('tags = :tags');
					params[':tags'] = tags;
				}

				updates.push('updated_at = CURRENT_TIMESTAMP');

				if (updates.length === 1) {
					throw new Error('Nenhum campo para atualizar foi fornecido');
				}

				const update_query = `
					UPDATE docs_turso 
					SET ${updates.join(', ')}
					WHERE id = :id
				`;

				const result = await database_client.execute_query(
					database_name,
					update_query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									database: database_name,
									rowsAffected: result.rowsAffected,
									message: 'Documento atualizado com sucesso',
								},
								null,
								2,
							),
						},
					],
				};
			}

			// turso_delete_doc
			if (request.params.name === 'turso_delete_doc') {
				const { id, database } = request.params.arguments as {
					id: number;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				const delete_query = 'DELETE FROM docs_turso WHERE id = :id';
				const params = { ':id': id };

				const result = await database_client.execute_query(
					database_name,
					delete_query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									database: database_name,
									rowsAffected: result.rowsAffected,
									message: result.rowsAffected > 0 
										? 'Documento removido com sucesso' 
										: 'Nenhum documento encontrado com esse ID',
								},
								null,
								2,
							),
						},
					],
				};
			}

			// turso_get_doc_by_path
			if (request.params.name === 'turso_get_doc_by_path') {
				const { file_path, database } = request.params.arguments as {
					file_path: string;
					database?: string;
				};

				const database_name = resolve_database_name(database);

				if (database) {
					set_current_database(database);
				}

				const query = 'SELECT * FROM docs_turso WHERE file_path = :file_path';
				const params = { ':file_path': file_path };

				const result = await database_client.execute_query(
					database_name,
					query,
					params,
				);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									database: database_name,
									document: result.rows[0] || null,
									found: result.rows.length > 0,
								},
								null,
								2,
							),
						},
					],
				};
			}

			// Se não for uma ferramenta reconhecida
			throw new Error(`Ferramenta desconhecida: ${request.params.name}`);
		} catch (error) {
			console.error('Erro ao executar ferramenta docs_turso:', error);
			return {
				content: [
					{
						type: 'text',
						text: `Erro: ${(error as Error).message}`,
					},
				],
				isError: true,
			};
		}
	});
}

/**
 * Formata o resultado de uma query para melhor legibilidade
 * Trata serialização de BigInt
 */
function format_query_result(result: ResultSet): any {
	// Converte BigInt para string para evitar problemas de serialização
	const lastInsertRowid =
		result.lastInsertRowid !== null &&
		typeof result.lastInsertRowid === 'bigint'
			? result.lastInsertRowid.toString()
			: result.lastInsertRowid;

	return {
		rows: result.rows,
		rowsAffected: result.rowsAffected,
		lastInsertRowid: lastInsertRowid,
		columns: result.columns,
	};
}