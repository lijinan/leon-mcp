#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { SqlConnectionManager } from './SqlConnectionManager.js';
import { QueryExecutor } from './QueryExecutor.js';
async function main() {
    const server = new Server({
        name: 'leon-mssql',
        version: '1.0.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    const connectionManager = new SqlConnectionManager();
    const queryExecutor = new QueryExecutor(connectionManager);
    const connectionString = process.env.MSSQL_CONNECTION_STRING;
    const serverEnv = process.env.MSSQL_SERVER;
    const databaseEnv = process.env.MSSQL_DATABASE;
    const userEnv = process.env.MSSQL_USER;
    const passwordEnv = process.env.MSSQL_PASSWORD;
    const portEnv = process.env.MSSQL_PORT;
    const encryptEnv = process.env.MSSQL_ENCRYPT;
    const trustServerCertEnv = process.env.MSSQL_TRUST_SERVER_CERTIFICATE;
    function normalizeConnectionString(connStr) {
        let normalized = connStr;
        const replacements = [
            { pattern: /user\s*id\s*=/gi, replacement: 'User Id=' },
            { pattern: /userid\s*=/gi, replacement: 'User Id=' },
            { pattern: /uid\s*=/gi, replacement: 'User Id=' },
            { pattern: /user\s*=/gi, replacement: 'User Id=' },
            { pattern: /pwd\s*=/gi, replacement: 'Password=' },
            { pattern: /pass\s*=/gi, replacement: 'Password=' },
            { pattern: /data\s*source\s*=/gi, replacement: 'Server=' },
            { pattern: /datasource\s*=/gi, replacement: 'Server=' },
            { pattern: /initial\s*catalog\s*=/gi, replacement: 'Database=' }
        ];
        for (const { pattern, replacement } of replacements) {
            normalized = normalized.replace(pattern, replacement);
        }
        return normalized;
    }
    console.error('Environment variables check:');
    console.error('MSSQL_CONNECTION_STRING:', connectionString ? '***SET***' : 'NOT SET');
    console.error('MSSQL_SERVER:', serverEnv || 'NOT SET');
    console.error('MSSQL_DATABASE:', databaseEnv || 'NOT SET');
    if (connectionString || (serverEnv && databaseEnv && userEnv && passwordEnv)) {
        try {
            const config = {};
            if (connectionString) {
                let enhancedConnectionString = normalizeConnectionString(connectionString);
                const serverMatch = enhancedConnectionString.match(/server\s*=\s*([^;]+)/i);
                const isIpAddress = serverMatch && /^(\d{1,3}\.){3}\d{1,3}$/.test(serverMatch[1].trim());
                if (!enhancedConnectionString.toLowerCase().includes('encrypt=')) {
                    enhancedConnectionString += isIpAddress ? 'Encrypt=false;' : 'Encrypt=true;';
                }
                if (!enhancedConnectionString.toLowerCase().includes('trustservercertificate=')) {
                    enhancedConnectionString += 'TrustServerCertificate=true;';
                }
                config.connectionString = enhancedConnectionString;
                console.error('Using connection string from environment');
            }
            else {
                const isIpAddress = serverEnv ? /^(\d{1,3}\.){3}\d{1,3}$/.test(serverEnv) : false;
                config.server = serverEnv;
                config.database = databaseEnv;
                config.user = userEnv;
                config.password = passwordEnv;
                if (portEnv)
                    config.port = parseInt(portEnv, 10);
                if (encryptEnv)
                    config.encrypt = encryptEnv.toLowerCase() === 'true';
                if (trustServerCertEnv)
                    config.trustServerCertificate = trustServerCertEnv.toLowerCase() === 'true';
                if (config.encrypt === undefined) {
                    config.encrypt = !isIpAddress;
                }
                if (config.trustServerCertificate === undefined) {
                    config.trustServerCertificate = true;
                }
                console.error('Using individual parameters from environment');
            }
            await connectionManager.configureConnection(config);
            console.error('Auto-connected to MSSQL database from environment variables');
        }
        catch (error) {
            console.error('Failed to auto-connect from environment variables:', error);
        }
    }
    else {
        console.error('No connection configuration found in environment variables');
    }
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'configure_connection',
                    description: 'Configure MSSQL database connection. You can either provide a full connection string or individual connection parameters.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            connectionString: {
                                type: 'string',
                                description: 'Full connection string (e.g., "Server=localhost;Database=mydb;User Id=sa;Password=pass123;")'
                            },
                            server: {
                                type: 'string',
                                description: 'Database server hostname or IP address'
                            },
                            database: {
                                type: 'string',
                                description: 'Database name'
                            },
                            user: {
                                type: 'string',
                                description: 'Username for authentication'
                            },
                            password: {
                                type: 'string',
                                description: 'Password for authentication'
                            },
                            port: {
                                type: 'number',
                                description: 'Database port (default: 1433)',
                                default: 1433
                            },
                            encrypt: {
                                type: 'boolean',
                                description: 'Enable encryption (default: true)',
                                default: true
                            },
                            trustServerCertificate: {
                                type: 'boolean',
                                description: 'Trust server certificate (default: false)',
                                default: false
                            },
                            options: {
                                type: 'object',
                                description: 'Additional connection options'
                            }
                        }
                    }
                },
                {
                    name: 'execute_query',
                    description: 'Execute a SQL query against the configured database',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'SQL query to execute'
                            },
                            parameters: {
                                type: 'object',
                                description: 'Query parameters as key-value pairs'
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'execute_stored_procedure',
                    description: 'Execute a stored procedure',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            procedureName: {
                                type: 'string',
                                description: 'Name of the stored procedure to execute'
                            },
                            parameters: {
                                type: 'object',
                                description: 'Procedure parameters as key-value pairs'
                            }
                        },
                        required: ['procedureName']
                    }
                },
                {
                    name: 'get_tables',
                    description: 'Get list of tables in the database',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            schema: {
                                type: 'string',
                                description: 'Schema name (default: dbo)',
                                default: 'dbo'
                            }
                        }
                    }
                },
                {
                    name: 'get_table_schema',
                    description: 'Get schema information for a specific table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Name of the table'
                            },
                            schema: {
                                type: 'string',
                                description: 'Schema name (default: dbo)',
                                default: 'dbo'
                            }
                        },
                        required: ['tableName']
                    }
                },
                {
                    name: 'disconnect',
                    description: 'Disconnect from the database',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ]
        };
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'configure_connection':
                    if (!args)
                        throw new Error('Arguments required for configure_connection');
                    if (!args.connectionString && !(args.server && args.database && args.user && args.password)) {
                        throw new Error('Either connectionString or (server, database, user, password) must be provided');
                    }
                    const configResult = await connectionManager.configureConnection(args);
                    return {
                        content: [{
                                type: 'text',
                                text: configResult
                            }]
                    };
                case 'execute_query':
                    if (!args || typeof args.query !== 'string')
                        throw new Error('Query argument required for execute_query');
                    const queryResult = await queryExecutor.executeQuery(args.query, args.parameters);
                    return {
                        content: [{
                                type: 'text',
                                text: queryResult
                            }]
                    };
                case 'execute_stored_procedure':
                    if (!args || typeof args.procedureName !== 'string')
                        throw new Error('Procedure name required for execute_stored_procedure');
                    const procResult = await queryExecutor.executeStoredProcedure(args.procedureName, args.parameters);
                    return {
                        content: [{
                                type: 'text',
                                text: procResult
                            }]
                    };
                case 'get_tables':
                    const tablesResult = await queryExecutor.getTables(typeof args?.schema === 'string' ? args.schema : undefined);
                    return {
                        content: [{
                                type: 'text',
                                text: tablesResult
                            }]
                    };
                case 'get_table_schema':
                    if (!args || typeof args.tableName !== 'string')
                        throw new Error('Table name required for get_table_schema');
                    const schemaResult = await queryExecutor.getTableSchema(args.tableName, typeof args.schema === 'string' ? args.schema : undefined);
                    return {
                        content: [{
                                type: 'text',
                                text: schemaResult
                            }]
                    };
                case 'disconnect':
                    const disconnectResult = await connectionManager.disconnect();
                    return {
                        content: [{
                                type: 'text',
                                text: disconnectResult
                            }]
                    };
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        catch (error) {
            return {
                content: [{
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`
                    }],
                isError: true
            };
        }
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MSSQL MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map