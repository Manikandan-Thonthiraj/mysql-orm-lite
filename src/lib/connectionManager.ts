import * as mysql from 'mysql2/promise';
import { DbConfig, Logger } from '../types';

// Default logger
const defaultLogger: Logger = {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args)
};

const pools = new Map<string, mysql.Pool>();
let logger: Logger = defaultLogger;
let defaultConfig: DbConfig | null = null;

const getPoolKey = (config: DbConfig): string => {
    return `${config.host}:${config.port || 3306}:${config.user}:${config.database}`;
};

const connectionManager = {
    /**
     * Initialize with default config and optional logger
     * @param config - Database configuration
     * @param customLogger - Custom logger (optional)
     */
    init: (config: DbConfig, customLogger?: Logger) => {
        if (!config || !config.database) {
            throw new Error('Valid database configuration required');
        }
        defaultConfig = config;
        if (customLogger) {
            logger = customLogger;
        }
        logger.info('Connection manager initialized');
    },

    /**
     * Set custom logger
     * @param customLogger - Logger with info, error, warn methods
     */
    setLogger: (customLogger: Logger) => {
        logger = customLogger;
    },

    /**
     * Get or create a connection pool
     * @param dbConfig - Database configuration (optional)
     * @returns MySQL connection pool
     */
    getPool: async (dbConfig?: DbConfig): Promise<mysql.Pool> => {
        const conf = dbConfig || defaultConfig;
        if (!conf || !conf.database) {
            throw new Error('Database configuration missing. Call connectionManager.init() first or provide dbConfig');
        }

        const key = getPoolKey(conf);
        if (pools.has(key)) {
            return pools.get(key)!;
        }

        try {
            logger.info(`Creating new connection pool for ${key}`);
            const pool = mysql.createPool({
                host: conf.host,
                user: conf.user,
                password: conf.password,
                database: conf.database,
                port: conf.port || 3306,
                waitForConnections: true,
                connectionLimit: conf.connectionLimit || 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });
            pools.set(key, pool);
            return pool;
        } catch (error) {
            logger.error('Failed to create connection pool:', error);
            throw error;
        }
    },

    /**
     * Close a specific pool
     * @param config - Database configuration
     */
    closePool: async (config: DbConfig) => {
        const key = getPoolKey(config);
        if (pools.has(key)) {
            const pool = pools.get(key)!;
            await pool.end();
            pools.delete(key);
            logger.info(`Closed connection pool for ${key}`);
        }
    },

    /**
     * Close all pools (call on application shutdown)
     */
    closeAllPools: async () => {
        for (const [key, pool] of pools.entries()) {
            try {
                await pool.end();
                logger.info(`Closed connection pool for ${key}`);
            } catch (error) {
                logger.error(`Error closing pool ${key}:`, error);
            }
        }
        pools.clear();
    },

    /**
     * Get logger instance
     */
    getLogger: (): Logger => logger
};

export default connectionManager;
export { connectionManager };
