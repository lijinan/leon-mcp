import sql from 'mssql';

export interface DatabaseConfig {
  connectionString?: string;
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  options?: Record<string, any>;
}

export class SqlConnectionManager {
  private pool: sql.ConnectionPool | null = null;
  private config: DatabaseConfig | null = null;
  private connectionLock: Promise<any> = Promise.resolve();

  async configureConnection(config: DatabaseConfig): Promise<string> {
    const connectionPromise = this._configureConnection(config);
    this.connectionLock = connectionPromise;
    await connectionPromise;
    return 'Successfully connected to database';
  }

  private async _configureConnection(config: DatabaseConfig): Promise<void> {
    try {
      if (this.pool) {
        try {
          await this.pool.close();
        } catch (error) {
          console.error('Error closing old connection:', error);
        }
        this.pool = null;
      }

      this.config = config;

      if (config.connectionString) {
        let enhancedConnectionString = this.normalizeConnectionString(config.connectionString);
        
        const isIpAddress = this.isIpAddress(enhancedConnectionString);
        
        if (!enhancedConnectionString.toLowerCase().includes('encrypt=')) {
          enhancedConnectionString += isIpAddress ? 'Encrypt=false;' : 'Encrypt=true;';
        }
        if (!enhancedConnectionString.toLowerCase().includes('trustservercertificate=')) {
          enhancedConnectionString += 'TrustServerCertificate=true;';
        }
        
        this.pool = new sql.ConnectionPool(enhancedConnectionString);
      } else {
        if (!config.server || !config.database || !config.user || !config.password) {
          throw new Error('When not using connectionString, server, database, user, and password are required');
        }

        const isIpAddress = this.isIpAddress(config.server);

        const connectionConfig: sql.config = {
          server: config.server,
          database: config.database,
          user: config.user,
          password: config.password,
          port: config.port || 1433,
          options: {
            encrypt: config.encrypt !== undefined ? config.encrypt : !isIpAddress,
            trustServerCertificate: config.trustServerCertificate !== undefined ? config.trustServerCertificate : true,
            enableArithAbort: true,
            ...config.options
          }
        };
        
        this.pool = new sql.ConnectionPool(connectionConfig);
      }
      
      await this.pool.connect();
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isIpAddress(input: string): boolean {
    if (!input) return false;
    
    const ipMatch = input.match(/server\s*=\s*([^;]+)/i);
    if (ipMatch) {
      const serverValue = ipMatch[1].trim();
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(serverValue);
    }
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(input.trim());
  }

  private normalizeConnectionString(connectionString: string): string {
    let normalized = connectionString;
    
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

  async getConnection(): Promise<sql.ConnectionPool> {
    await this.connectionLock;
    
    if (!this.config) {
      throw new Error('Database not connected. Please configure connection first.');
    }

    if (!this.pool || !this.pool.connected) {
      console.error('Connection lost, attempting to reconnect...');
      try {
        await this.reconnect();
      } catch (error) {
        throw new Error(`Failed to reconnect to database: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (!this.pool) {
      throw new Error('Failed to establish database connection');
    }
    
    return this.pool;
  }

  private async reconnect(): Promise<void> {
    await this.connectionLock;
    
    if (!this.config) {
      throw new Error('No configuration available for reconnection');
    }

    if (this.pool) {
      try {
        await this.pool.close();
      } catch (error) {
        console.error('Error closing old connection:', error);
      }
      this.pool = null;
    }

    if (this.config.connectionString) {
      let enhancedConnectionString = this.normalizeConnectionString(this.config.connectionString);
      
      const isIpAddress = this.isIpAddress(enhancedConnectionString);
      
      if (!enhancedConnectionString.toLowerCase().includes('encrypt=')) {
        enhancedConnectionString += isIpAddress ? 'Encrypt=false;' : 'Encrypt=true;';
      }
      if (!enhancedConnectionString.toLowerCase().includes('trustservercertificate=')) {
        enhancedConnectionString += 'TrustServerCertificate=true;';
      }
      
      this.pool = new sql.ConnectionPool(enhancedConnectionString);
    } else {
      if (!this.config.server || !this.config.database || !this.config.user || !this.config.password) {
        throw new Error('Missing required connection parameters');
      }

      const isIpAddress = this.isIpAddress(this.config.server);

      const connectionConfig: sql.config = {
        server: this.config.server,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        port: this.config.port || 1433,
        options: {
          encrypt: this.config.encrypt !== undefined ? this.config.encrypt : !isIpAddress,
          trustServerCertificate: this.config.trustServerCertificate !== undefined ? this.config.trustServerCertificate : true,
          enableArithAbort: true,
          ...this.config.options
        }
      };
      
      this.pool = new sql.ConnectionPool(connectionConfig);
    }
    
    await this.pool.connect();
    console.error('Successfully reconnected to database');
  }

  async disconnect(): Promise<string> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.config = null;
      return 'Successfully disconnected from database';
    }
    return 'No active database connection';
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  getCurrentConfig(): DatabaseConfig | null {
    return this.config;
  }
}
