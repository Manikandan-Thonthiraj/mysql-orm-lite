'use strict';
const mysql = require('mysql2/promise');

// Default logger
const defaultLogger = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args)
};

const pools = new Map();
let logger = defaultLogger;
let defaultConfig = null;

const getPoolKey = (config) => {
    return `${config.host}:${config.port || 3306}:${config.user}:${config.database}`;
};

const connectionManager = {
    /**
     * Initialize with default config and optional logger
     * @param {Object} config - Database configuration
     * @param {Object} customLogger - Custom logger (optional)
     */
    init: (config, customLogger) => {
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
     * @param {Object} customLogger - Logger with info, error, warn methods
     */
    setLogger: (customLogger) => {
        logger = customLogger;
    },

    /**
     * Get or create a connection pool
     * @param {Object} dbConfig - Database configuration (optional)
     * @returns {Promise<Pool>} MySQL connection pool
     */
    getPool: async (dbConfig) => {
        const conf = dbConfig || defaultConfig;
        if (!conf || !conf.database) {
            throw new Error('Database configuration missing. Call connectionManager.init() first or provide dbConfig');
        }

        const key = getPoolKey(conf);
        if (pools.has(key)) {
            return pools.get(key);
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
     * @param {Object} config - Database configuration
     */
    closePool: async (config) => {
        const key = getPoolKey(config);
        if (pools.has(key)) {
            const pool = pools.get(key);
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
    getLogger: () => logger
};

module.exports = connectionManager;
