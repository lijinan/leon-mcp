import sql from 'mssql';
export class QueryExecutor {
    connectionManager;
    MAX_RETRIES = 3;
    RETRY_DELAY = 1000;
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    async executeQuery(query, parameters) {
        return this.executeWithRetry(async () => {
            const pool = await this.connectionManager.getConnection();
            const request = pool.request();
            if (parameters) {
                for (const [key, value] of Object.entries(parameters)) {
                    request.input(key, value);
                }
            }
            const result = await request.query(query);
            if (result.recordset && result.recordset.length > 0) {
                return JSON.stringify({
                    success: true,
                    rowCount: result.rowsAffected[0],
                    data: result.recordset
                }, null, 2);
            }
            else {
                return JSON.stringify({
                    success: true,
                    rowCount: result.rowsAffected[0],
                    message: 'Query executed successfully. No rows returned.'
                }, null, 2);
            }
        }, 'Query execution failed');
    }
    async executeStoredProcedure(procedureName, parameters) {
        return this.executeWithRetry(async () => {
            const pool = await this.connectionManager.getConnection();
            const request = pool.request();
            if (parameters) {
                for (const [key, value] of Object.entries(parameters)) {
                    request.input(key, value);
                }
            }
            const result = await request.execute(procedureName);
            if (result.recordset && result.recordset.length > 0) {
                return JSON.stringify({
                    success: true,
                    procedureName,
                    rowCount: result.rowsAffected[0],
                    data: result.recordset
                }, null, 2);
            }
            else {
                return JSON.stringify({
                    success: true,
                    procedureName,
                    rowCount: result.rowsAffected[0],
                    message: 'Stored procedure executed successfully. No rows returned.'
                }, null, 2);
            }
        }, 'Stored procedure execution failed');
    }
    async getTables(schema = 'dbo') {
        return this.executeWithRetry(async () => {
            const pool = await this.connectionManager.getConnection();
            const result = await pool.request()
                .input('schema', sql.NVarChar, schema)
                .query(`
          SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = @schema
          ORDER BY TABLE_NAME
        `);
            return JSON.stringify({
                success: true,
                schema,
                tables: result.recordset
            }, null, 2);
        }, 'Failed to get tables');
    }
    async getTableSchema(tableName, schema = 'dbo') {
        return this.executeWithRetry(async () => {
            const pool = await this.connectionManager.getConnection();
            const result = await pool.request()
                .input('schema', sql.NVarChar, schema)
                .input('tableName', sql.NVarChar, tableName)
                .query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            ORDINAL_POSITION
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @schema
            AND TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);
            return JSON.stringify({
                success: true,
                schema,
                tableName,
                columns: result.recordset
            }, null, 2);
        }, 'Failed to get table schema');
    }
    async executeWithRetry(operation, errorMessage, attempt = 1) {
        try {
            return await operation();
        }
        catch (error) {
            const isConnectionError = error instanceof Error && (error.message.includes('socket hang up') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('Connection lost') ||
                error.message.includes('Failed to connect'));
            if (isConnectionError && attempt < this.MAX_RETRIES) {
                console.error(`${errorMessage} (attempt ${attempt}/${this.MAX_RETRIES}), retrying...`);
                await this.delay(this.RETRY_DELAY * attempt);
                return this.executeWithRetry(operation, errorMessage, attempt + 1);
            }
            throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=QueryExecutor.js.map