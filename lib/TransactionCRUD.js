'use strict';
const connectionManager = require('./connectionManager');
const crudUtils = require('./crud').utils;

class TransactionCRUD {
    constructor() {
        this.connection = null;
        this.transactionActive = false;
        this.debug = false;
    }

    /**
     * Initialize a transaction
     * @param {Object} dbConfig - Database configuration (optional)
     */
    async init(dbConfig) {
        const logger = connectionManager.getLogger();
        try {
            const pool = await connectionManager.getPool(dbConfig);
            this.connection = await pool.getConnection();

            await this.connection.beginTransaction();
            this.transactionActive = true;
            logger.info('Transaction initialized successfully');

            return this.connection;
        } catch (error) {
            logger.error('Failed to initialize transaction:', error);
            if (this.connection) {
                this.connection.release();
                this.connection = null;
            }
            throw error;
        }
    }

    /**
     * Execute a query within the transaction
     */
    async executeQuery(query, params = [], operation = 'TRANS_QUERY') {
        if (!this.connection || !this.transactionActive) {
            throw new Error('No active transaction. Call init() first.');
        }

        const logger = connectionManager.getLogger();
        const startTime = Date.now();
        try {
            const [results] = await this.connection.query(query, params);

            const duration = Date.now() - startTime;
            if (duration > 1000) {
                logger.warn(`[TRANS] Slow Query (${duration}ms): ${query}`);
            }

            return results;
        } catch (error) {
            logger.error(`${operation} Failed: ${error.message}`);
            logger.error(`Query: ${query}`);
            throw error;
        }
    }

    /**
     * Commit the transaction
     */
    async commit() {
        if (!this.connection || !this.transactionActive) {
            throw new Error('No active transaction to commit');
        }

        const logger = connectionManager.getLogger();
        try {
            await this.connection.commit();
            logger.info('Transaction committed');
        } catch (error) {
            logger.error('Commit failed, rolling back...', error);
            await this.rollback();
            throw error;
        } finally {
            this._cleanup();
        }
    }

    /**
     * Rollback the transaction
     */
    async rollback() {
        if (!this.connection) return;

        const logger = connectionManager.getLogger();
        try {
            await this.connection.rollback();
            logger.info('Transaction rolled back');
        } catch (error) {
            logger.error('Rollback failed:', error);
        } finally {
            this._cleanup();
        }
    }

    _cleanup() {
        if (this.connection) {
            this.connection.release();
            this.connection = null;
        }
        this.transactionActive = false;
    }

    // CRUD Methods

    async find(query, params = []) {
        return await this.executeQuery(query, params, 'TRANS_FIND');
    }

    async insert(table, data) {
        if (!table || !data) throw new Error('Invalid table or data');
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;

        const result = await this.executeQuery(sql, values, 'TRANS_INSERT');
        return result.insertId;
    }

    async update(table, data, query) {
        if (!query || !query.toLowerCase().includes('where')) throw new Error('Update requires WHERE');

        const { setFields, params } = crudUtils.prepareUpdateParams(data);
        const sql = `UPDATE ${table} SET ${setFields.join(', ')} ${query}`;

        const result = await this.executeQuery(sql, params, 'TRANS_UPDATE');
        return result.affectedRows;
    }

    async delete(query, table) {
        if (!query || !query.toLowerCase().includes('where')) throw new Error('Delete requires WHERE');
        const sql = table ? `DELETE FROM ${table} ${query}` : query;
        const result = await this.executeQuery(sql, [], 'TRANS_DELETE');
        return result.affectedRows;
    }

    async buildAndExecuteSelectQuery(options = {}) {
        const logger = connectionManager.getLogger();
        try {
            const { query, params } = crudUtils._buildSelectQuery(options);
            return await this.executeQuery(query, params, 'TRANS_BUILD_SELECT');
        } catch (err) {
            logger.error('buildAndExecuteSelectQuery failed:', err);
            throw err;
        }
    }

    async buildAndExecuteUpdateQuery(options = {}) {
        const logger = connectionManager.getLogger();
        try {
            const { query, params } = crudUtils._buildUpdateQuery(options);
            const result = await this.executeQuery(query, params, 'TRANS_BUILD_UPDATE');
            return result.affectedRows;
        } catch (err) {
            logger.error('buildAndExecuteUpdateQuery failed:', err);
            throw err;
        }
    }

    async buildAndExecuteDeleteQuery(options = {}) {
        const logger = connectionManager.getLogger();
        try {
            const { query, params } = crudUtils._buildDeleteQuery(options);
            const result = await this.executeQuery(query, params, 'TRANS_BUILD_DELETE');
            return result.affectedRows;
        } catch (err) {
            logger.error('buildAndExecuteDeleteQuery failed:', err);
            throw err;
        }
    }

    // Alternative shorter method names (aliases)
    async select(options) {
        return this.buildAndExecuteSelectQuery(options);
    }

    async findWhere(options) {
        return this.buildAndExecuteSelectQuery(options);
    }

    async findForUpdate(options) {
        options.forUpdate = true;
        return this.buildAndExecuteSelectQuery(options);
    }

    async query(options) {
        return this.buildAndExecuteSelectQuery(options);
    }

    async updateWhere(options) {
        return this.buildAndExecuteUpdateQuery(options);
    }

    async updateQuery(options) {
        return this.buildAndExecuteUpdateQuery(options);
    }

    async deleteWhere(options) {
        return this.buildAndExecuteDeleteQuery(options);
    }

    async remove(options) {
        return this.buildAndExecuteDeleteQuery(options);
    }
}

module.exports = TransactionCRUD;
