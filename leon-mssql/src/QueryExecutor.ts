import sql from 'mssql';
import { SqlConnectionManager } from './SqlConnectionManager.js';

export class QueryExecutor {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(private connectionManager: SqlConnectionManager) {}

  async executeQuery(query: string, parameters?: Record<string, any>): Promise<string> {
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
      } else {
        return JSON.stringify({
          success: true,
          rowCount: result.rowsAffected[0],
          message: 'Query executed successfully. No rows returned.'
        }, null, 2);
      }
    }, 'Query execution failed');
  }

  async executeStoredProcedure(procedureName: string, parameters?: Record<string, any>): Promise<string> {
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
      } else {
        return JSON.stringify({
          success: true,
          procedureName,
          rowCount: result.rowsAffected[0],
          message: 'Stored procedure executed successfully. No rows returned.'
        }, null, 2);
      }
    }, 'Stored procedure execution failed');
  }

  async getTables(schema: string = 'dbo'): Promise<string> {
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

  async getTableSchema(tableName: string, schema: string = 'dbo'): Promise<string> {
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

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const isConnectionError = error instanceof Error && (
        error.message.includes('socket hang up') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('Connection lost') ||
        error.message.includes('Failed to connect')
      );

      if (isConnectionError && attempt < this.MAX_RETRIES) {
        console.error(`${errorMessage} (attempt ${attempt}/${this.MAX_RETRIES}), retrying...`);
        await this.delay(this.RETRY_DELAY * attempt);
        return this.executeWithRetry(operation, errorMessage, attempt + 1);
      }

      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
