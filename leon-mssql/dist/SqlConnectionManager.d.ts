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
export declare class SqlConnectionManager {
    private pool;
    private config;
    private connectionLock;
    configureConnection(config: DatabaseConfig): Promise<string>;
    private _configureConnection;
    private isIpAddress;
    private normalizeConnectionString;
    getConnection(): Promise<sql.ConnectionPool>;
    private reconnect;
    disconnect(): Promise<string>;
    isConnected(): boolean;
    getCurrentConfig(): DatabaseConfig | null;
}
//# sourceMappingURL=SqlConnectionManager.d.ts.map