import connectionManager from './connectionManager';
import performanceMonitor from './performanceMonitor';
import { DbConfig, SelectOptions, UpdateOptions, DeleteOptions, WhereConditions } from '../types';

export const utils = {
    handleConnectionError(err: any): Error {
        const errorMessages: Record<string, string> = {
            PROTOCOL_CONNECTION_LOST: 'Database connection was closed.',
            ER_CON_COUNT_ERROR: 'Database has too many connections.',
            ECONNREFUSED: 'Database connection was refused.',
            POOL_CLOSED: 'Connection pool was closed'
        };
        return new Error(errorMessages[err.code] || err.message);
    },

    logQueryPerformance(query: string, startTime: number, params: any[] = []): number {
        const logger = connectionManager.getLogger();
        const duration = Date.now() - startTime;
        if (duration > 1000) {
            logger.warn(' Slow Query ================================================================== ');
            logger.warn(` Execution Time: ${duration}ms`);
            logger.warn(` Query: ${query}`);
            if (params.length) logger.warn(` Parameters: ${JSON.stringify(params)}`);
            logger.warn(' =========================================================================== ');
        }
        return duration;
    },

    async executeQuery({ query, params = [], dbConfig, operation = 'query' }: { query: string; params?: any[]; dbConfig?: DbConfig; operation?: string }): Promise<any> {
        const startTime = Date.now();
        const logger = connectionManager.getLogger();

        try {
            const pool = await connectionManager.getPool(dbConfig);
            const [results] = await pool.query(query, params);
            const duration = this.logQueryPerformance(query, startTime, params);

            // Record in performance monitor if enabled
            performanceMonitor.recordQuery(query, duration, params);

            return results;
        } catch (error: any) {
            logger.error(`${operation} Error: ${error.message}`);
            logger.error(`Query: ${query}`);
            if (params.length) logger.error('Parameters:', JSON.stringify(params));
            throw error;
        }
    },

    validateUpdateParams(table: string, data: Record<string, any>, query: string): string[] {
        const errors: string[] = [];
        if (!table || typeof table !== 'string') errors.push('Invalid table name');
        else if (!/^[a-zA-Z0-9_]+$/.test(table)) errors.push('Table name contains invalid characters');

        if (!data || typeof data !== 'object' || Array.isArray(data)) errors.push('Data must be a non-null object');
        else if (Object.keys(data).length === 0) errors.push('Data object cannot be empty');

        if (!query || typeof query !== 'string') errors.push('Invalid WHERE clause');
        else if (!query.toLowerCase().includes('where')) errors.push('WHERE clause is required for security');

        return errors;
    },

    prepareUpdateParams(data: Record<string, any>): { setFields: string[]; params: any[] } {
        const setFields: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue;

            if (value && typeof value === 'object' && value.__raw) {
                setFields.push(`${key} = ${value.value}`);
                continue;
            }

            if (value === null) {
                setFields.push(`${key} = NULL`);
            } else {
                setFields.push(`${key} = ?`);
                params.push(value);
            }
        }

        return { setFields, params };
    },

    _buildWhereClause(conditions: WhereConditions): { clause: string; params: any[] } {
        const params: any[] = [];
        const buildCondition = (key: string, value: any): string => {
            const column = key;
            if (value === null) return `${column} IS NULL`;
            if (typeof value === 'object' && !Array.isArray(value)) {
                return Object.entries(value).map(([op, val]: [string, any]) => {
                    switch (op) {
                        case '$eq': params.push(val); return `${column} = ?`;
                        case '$ne': params.push(val); return `${column} != ?`;
                        case '$gt': params.push(val); return `${column} > ?`;
                        case '$gte': params.push(val); return `${column} >= ?`;
                        case '$lt': params.push(val); return `${column} < ?`;
                        case '$lte': params.push(val); return `${column} <= ?`;
                        case '$in':
                            if (!val.length) return 'FALSE';
                            params.push(...val);
                            return `${column} IN (${val.map(() => '?').join(', ')})`;
                        case '$notIn':
                        case '$nIn':
                        case '$nin':
                            if (!val.length) return 'TRUE';
                            params.push(...val);
                            return `${column} NOT IN (${val.map(() => '?').join(', ')})`;
                        case '$like':
                            params.push(val); return `${column} LIKE ?`;
                        case '$between':
                            if (val.length !== 2) throw new Error('$between requires [min, max]');
                            params.push(val[0], val[1]);
                            return `${column} BETWEEN ? AND ?`;
                        default: throw new Error(`Unsupported operator: ${op}`);
                    }
                }).join(' AND ');
            }
            params.push(value);
            return `${column} = ?`;
        };

        const walk = (cond: any): string => {
            if (!cond || typeof cond !== 'object') return '';
            if (Array.isArray(cond)) return cond.map(walk).join(' AND ');

            if ('$and' in cond) return `(${cond.$and.map(walk).join(' AND ')})`;
            if ('$or' in cond) return `(${cond.$or.map(walk).join(' OR ')})`;
            if ('$not' in cond) return `(NOT ${walk(cond.$not)})`;

            return Object.entries(cond).map(([k, v]) => buildCondition(k, v)).join(' AND ');
        };

        const clause = walk(conditions);
        return { clause, params };
    },

    _buildSelectQuery(options: SelectOptions): { query: string; params: any[] } {
        let { table, fields = '*', joins = [], where, orderBy, limit, offset, groupBy, having, alias, forUpdate = false } = options;

        if (fields && Array.isArray(fields) && fields.length > 0) {
            fields = fields.filter(field => field && field.trim() !== '').join(', ');
        } else if (fields && Array.isArray(fields)) {
            fields = '*';
        }

        let query = `SELECT ${fields} FROM ${table}${alias ? ' ' + alias : ''}`;
        const allParams: any[] = [];

        for (const join of joins) {
            let { type = 'INNER', table: joinTable, alias, on } = join;
            const onClause = Array.isArray(on) ? on.join(' AND ') : on;
            query += ` ${type.toUpperCase()} JOIN ${joinTable}${alias ? ' ' + alias : ''} ON ${onClause}`;
        }

        if (where) {
            const { clause, params } = this._buildWhereClause(where);
            if (clause) {
                query += ` WHERE ${clause}`;
                allParams.push(...params);
            }
        }

        if (groupBy) query += ` GROUP BY ${groupBy}`;
        if (having) query += ` HAVING ${having}`;
        if (orderBy) query += ` ORDER BY ${orderBy}`;

        if (typeof limit === 'number' && limit && limit > 0) {
            query += ` LIMIT ${limit}`;
            if (typeof offset === 'number') query += ` OFFSET ${offset}`;
        }

        if (forUpdate) {
            query += ' FOR UPDATE';
        }

        return { query, params: allParams };
    },

    _buildUpdateQuery(options: UpdateOptions): { query: string; params: any[] } {
        const { table, data, where } = options;
        const { setFields, params } = this.prepareUpdateParams(data);

        if (setFields.length === 0) throw new Error('No valid fields to update');

        let query = `UPDATE ${table} SET ${setFields.join(', ')}`;
        const allParams = [...params];

        if (where) {
            const { clause, params: whereParams } = this._buildWhereClause(where);
            if (clause) {
                query += ` WHERE ${clause}`;
                allParams.push(...whereParams);
            }
        }

        return { query, params: allParams };
    },

    _buildDeleteQuery(options: DeleteOptions): { query: string; params: any[] } {
        const { table, where } = options;
        if (!table) throw new Error('Table name is required for delete');

        let query = `DELETE FROM ${table}`;
        const allParams: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this._buildWhereClause(where);
            if (clause) {
                query += ` WHERE ${clause}`;
                allParams.push(...whereParams);
            } else {
                throw new Error('DELETE requires a valid WHERE clause for safety');
            }
        } else {
            throw new Error('DELETE requires a WHERE clause for safety');
        }

        return { query, params: allParams };
    }
};

// Public API
export const find = async function (query: string, params: any[] = [], dbConfig?: DbConfig): Promise<any[]> {
    if (!query) return [];
    return await utils.executeQuery({ query, params, dbConfig, operation: 'find' });
};

export const findCount = async function (query: string, params: any[] = [], dbConfig?: DbConfig): Promise<number> {
    if (!query) return 0;
    const results = await utils.executeQuery({ query, params, dbConfig, operation: 'findCount' });
    return results && results[0] ? results[0].count : 0;
};

export const insert = async function (table: string, data: Record<string, any>, dbConfig?: DbConfig, debug = false, isIgnore = false): Promise<any> {
    if (!table || !data || typeof data !== 'object') throw new Error('Invalid table or data');

    const logger = connectionManager.getLogger();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = isIgnore
        ? `INSERT IGNORE INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`
        : `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;

    const result = await utils.executeQuery({ query: sql, params: values, dbConfig, operation: 'insert' });

    if (debug) {
        logger.info({ operation: 'INSERT', table, insertId: result.insertId });
    }
    return result.insertId;
};

export const update = async function (table: string, data: Record<string, any>, query: string, dbConfig?: DbConfig, debug = false): Promise<number> {
    const errors = utils.validateUpdateParams(table, data, query);
    if (errors.length > 0) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const logger = connectionManager.getLogger();
    const { setFields, params } = utils.prepareUpdateParams(data);
    if (setFields.length === 0) throw new Error('No valid fields to update');

    const sql = `UPDATE ${table} SET ${setFields.join(', ')} ${query}`;
    const result = await utils.executeQuery({ query: sql, params, dbConfig, operation: 'update' });

    if (debug) {
        logger.info({ operation: 'UPDATE', table, affectedRows: result.affectedRows });
    }
    return result.affectedRows;
};

export const _delete = async function (query: string, table?: string, dbConfig?: DbConfig): Promise<number> {
    if (!query || !query.toLowerCase().includes('where')) throw new Error('Invalid query or missing WHERE clause');

    const logger = connectionManager.getLogger();
    const sql = table ? `DELETE FROM ${table} ${query}` : query;
    const result = await utils.executeQuery({ query: sql, params: [], dbConfig, operation: 'delete' });
    logger.info(`Deleted ${result.affectedRows} records from ${table || 'custom query'}`);
    return result.affectedRows;
};

export { _delete as delete };

// Bulk Operations
export const bulkInsert = async function (
    table: string,
    records: Record<string, any>[],
    options?: { batchSize?: number; ignore?: boolean },
    dbConfig?: DbConfig
): Promise<{ totalInserted: number; batches: number; firstInsertId?: number; lastInsertId?: number }> {
    if (!table || !records || !Array.isArray(records) || records.length === 0) {
        throw new Error('Table name and records are required for bulk insert');
    }

    const batchSize = options?.batchSize || 1000;
    const isIgnore = options?.ignore || false;
    const logger = connectionManager.getLogger();

    // Validate all records have the same fields
    const fields = Object.keys(records[0]);
    for (const record of records) {
        const recordFields = Object.keys(record);
        if (recordFields.length !== fields.length || !recordFields.every(f => fields.includes(f))) {
            throw new Error('All records must have the same fields for bulk insert');
        }
    }

    let totalInserted = 0;
    let firstInsertId: number | undefined;
    let lastInsertId: number | undefined;
    const batches = Math.ceil(records.length / batchSize);

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];

        for (const record of batch) {
            const recordValues = fields.map(field => record[field]);
            values.push(...recordValues);
            placeholders.push(`(${fields.map(() => '?').join(', ')})`);
        }

        const sql = isIgnore
            ? `INSERT IGNORE INTO ${table} (${fields.join(', ')}) VALUES ${placeholders.join(', ')}`
            : `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${placeholders.join(', ')}`;

        const result = await utils.executeQuery({ query: sql, params: values, dbConfig, operation: 'bulkInsert' });

        totalInserted += result.affectedRows || 0;

        if (i === 0 && result.insertId) {
            firstInsertId = result.insertId;
        }
        if (result.insertId) {
            lastInsertId = result.insertId + (result.affectedRows || 1) - 1;
        }
    }

    logger.info(`Bulk inserted ${totalInserted} records into ${table} in ${batches} batches`);

    return {
        totalInserted,
        batches,
        firstInsertId,
        lastInsertId
    };
};

export const upsert = async function (
    table: string,
    data: Record<string, any>,
    options: { conflictKey: string | string[]; updateFields?: string[] },
    dbConfig?: DbConfig
): Promise<{ action: 'inserted' | 'updated'; affectedRows: number; insertId?: number }> {
    if (!table || !data || !options.conflictKey) {
        throw new Error('Table, data, and conflictKey are required for upsert');
    }

    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    // Determine which fields to update on duplicate key
    const conflictKeys = Array.isArray(options.conflictKey) ? options.conflictKey : [options.conflictKey];
    const updateFields = options.updateFields || fields.filter(f => !conflictKeys.includes(f));

    if (updateFields.length === 0) {
        throw new Error('No fields to update on duplicate key');
    }

    // Build UPDATE clause
    const updateClause = updateFields.map(field => `${field} = VALUES(${field})`).join(', ');

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

    const result = await utils.executeQuery({ query: sql, params: values, dbConfig, operation: 'upsert' });

    // affectedRows = 1 means inserted, 2 means updated, 0 means no change
    const action: 'inserted' | 'updated' = result.affectedRows === 1 ? 'inserted' : 'updated';

    return {
        action,
        affectedRows: result.affectedRows,
        insertId: result.insertId
    };
};

export const bulkUpsert = async function (
    table: string,
    records: Record<string, any>[],
    options: { conflictKey: string | string[]; updateFields?: string[]; batchSize?: number },
    dbConfig?: DbConfig
): Promise<{ totalAffected: number; batches: number }> {
    if (!table || !records || records.length === 0) {
        throw new Error('Table name and records are required for bulk upsert');
    }

    const batchSize = options?.batchSize || 1000;
    const logger = connectionManager.getLogger();

    // Validate all records have the same fields
    const fields = Object.keys(records[0]);
    for (const record of records) {
        const recordFields = Object.keys(record);
        if (recordFields.length !== fields.length || !recordFields.every(f => fields.includes(f))) {
            throw new Error('All records must have the same fields for bulk upsert');
        }
    }

    // Determine which fields to update on duplicate key
    const conflictKeys = Array.isArray(options.conflictKey) ? options.conflictKey : [options.conflictKey];
    const updateFields = options.updateFields || fields.filter(f => !conflictKeys.includes(f));

    if (updateFields.length === 0) {
        throw new Error('No fields to update on duplicate key');
    }

    const updateClause = updateFields.map(field => `${field} = VALUES(${field})`).join(', ');

    let totalAffected = 0;
    const batches = Math.ceil(records.length / batchSize);

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];

        for (const record of batch) {
            const recordValues = fields.map(field => record[field]);
            values.push(...recordValues);
            placeholders.push(`(${fields.map(() => '?').join(', ')})`);
        }

        const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${placeholders.join(', ')} ON DUPLICATE KEY UPDATE ${updateClause}`;

        const result = await utils.executeQuery({ query: sql, params: values, dbConfig, operation: 'bulkUpsert' });
        totalAffected += result.affectedRows || 0;
    }

    logger.info(`Bulk upsert affected ${totalAffected} records in ${table} in ${batches} batches`);

    return {
        totalAffected,
        batches
    };
};

// Query Builder Methods
export const buildAndExecuteSelectQuery = async function (options: SelectOptions, dbConfig?: DbConfig): Promise<any[]> {
    const { query, params } = utils._buildSelectQuery(options);
    return await utils.executeQuery({ query, params, dbConfig, operation: 'buildAndExecuteSelectQuery' });
};

export const buildAndExecuteUpdateQuery = async function (options: UpdateOptions, dbConfig?: DbConfig): Promise<number> {
    const { query, params } = utils._buildUpdateQuery(options);
    const result = await utils.executeQuery({ query, params, dbConfig, operation: 'buildAndExecuteUpdateQuery' });
    return result.affectedRows;
};

export const buildAndExecuteDeleteQuery = async function (options: DeleteOptions, dbConfig?: DbConfig): Promise<number> {
    const { query, params } = utils._buildDeleteQuery(options);
    const result = await utils.executeQuery({ query, params, dbConfig, operation: 'buildAndExecuteDeleteQuery' });
    return result.affectedRows;
};

// Aliases
export const select = buildAndExecuteSelectQuery;
export const findWhere = buildAndExecuteSelectQuery;
export const query = buildAndExecuteSelectQuery;

export const updateWhere = buildAndExecuteUpdateQuery;
export const updateQuery = buildAndExecuteUpdateQuery;

export const deleteWhere = buildAndExecuteDeleteQuery;
export const remove = buildAndExecuteDeleteQuery;
