import { SqlConnectionManager } from './SqlConnectionManager.js';
export declare class QueryExecutor {
    private connectionManager;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    constructor(connectionManager: SqlConnectionManager);
    executeQuery(query: string, parameters?: Record<string, any>): Promise<string>;
    executeStoredProcedure(procedureName: string, parameters?: Record<string, any>): Promise<string>;
    getTables(schema?: string): Promise<string>;
    getTableSchema(tableName: string, schema?: string): Promise<string>;
    private executeWithRetry;
    private delay;
}
//# sourceMappingURL=QueryExecutor.d.ts.map