import connectionManager from './connectionManager';
import { DbConfig, ColumnInfo, IndexInfo, ForeignKeyInfo, DependencyGraph } from '../types';

const schema = {
    /**
     * Get list of all tables in the database
     * @param dbConfig - Optional database configuration
     * @returns Array of table names
     */
    async tables(dbConfig?: DbConfig): Promise<string[]> {
        const pool = await connectionManager.getPool(dbConfig);
        const config = dbConfig || (connectionManager as any).defaultConfig;

        if (!config || !config.database) {
            throw new Error('Database name is required for schema introspection');
        }

        const query = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `;

        const [rows] = await pool.query(query, [config.database]);
        return (rows as any[]).map(row => row.TABLE_NAME);
    },

    /**
     * Get column information for a specific table
     * @param tableName - Name of the table
     * @param dbConfig - Optional database configuration
     * @returns Array of column information
     */
    async columns(tableName: string, dbConfig?: DbConfig): Promise<ColumnInfo[]> {
        if (!tableName) {
            throw new Error('Table name is required');
        }

        const pool = await connectionManager.getPool(dbConfig);
        const config = dbConfig || (connectionManager as any).defaultConfig;

        if (!config || !config.database) {
            throw new Error('Database name is required for schema introspection');
        }

        const query = `
            SELECT 
                COLUMN_NAME as name,
                COLUMN_TYPE as type,
                IS_NULLABLE as nullable,
                COLUMN_KEY as \`key\`,
                COLUMN_DEFAULT as \`default\`,
                EXTRA as extra
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `;

        const [rows] = await pool.query(query, [config.database, tableName]);
        return (rows as any[]).map(row => ({
            name: row.name,
            type: row.type,
            nullable: row.nullable === 'YES',
            key: row.key || '',
            default: row.default,
            extra: row.extra || ''
        }));
    },

    /**
     * Get index information for a specific table
     * @param tableName - Name of the table
     * @param dbConfig - Optional database configuration
     * @returns Array of index information
     */
    async indexes(tableName: string, dbConfig?: DbConfig): Promise<IndexInfo[]> {
        if (!tableName) {
            throw new Error('Table name is required');
        }

        const pool = await connectionManager.getPool(dbConfig);
        const config = dbConfig || (connectionManager as any).defaultConfig;

        if (!config || !config.database) {
            throw new Error('Database name is required for schema introspection');
        }

        const query = `
            SELECT 
                INDEX_NAME as name,
                COLUMN_NAME as \`column\`,
                NON_UNIQUE as non_unique,
                INDEX_TYPE as type
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `;

        const [rows] = await pool.query(query, [config.database, tableName]);
        return (rows as any[]).map(row => ({
            name: row.name,
            column: row.column,
            unique: row.non_unique === 0,
            type: row.type
        }));
    },

    /**
     * Get foreign key relationships for a specific table or all tables
     * @param tableName - Name of the table (optional, if not provided returns all foreign keys)
     * @param dbConfig - Optional database configuration
     * @returns Array of foreign key information
     */
    async foreignKeys(tableName?: string, dbConfig?: DbConfig): Promise<ForeignKeyInfo[]> {
        const pool = await connectionManager.getPool(dbConfig);
        const config = dbConfig || (connectionManager as any).defaultConfig;

        if (!config || !config.database) {
            throw new Error('Database name is required for schema introspection');
        }

        let query = `
            SELECT 
                TABLE_NAME as childTable,
                REFERENCED_TABLE_NAME as parentTable,
                CONSTRAINT_NAME as constraintName,
                COLUMN_NAME as columnName,
                REFERENCED_COLUMN_NAME as referencedColumnName
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `;

        const params: any[] = [config.database];

        if (tableName) {
            query += ` AND (TABLE_NAME = ? OR REFERENCED_TABLE_NAME = ?)`;
            params.push(tableName, tableName);
        }

        query += ` ORDER BY TABLE_NAME, ORDINAL_POSITION`;

        const [rows] = await pool.query(query, params);
        return rows as ForeignKeyInfo[];
    },

    /**
     * Get the correct order to delete/truncate tables based on foreign key dependencies
     * Uses topological sort to ensure child tables are deleted before parent tables
     * @param dbConfig - Optional database configuration
     * @returns Array of table names in deletion order (children first)
     */
    async deleteOrder(dbConfig?: DbConfig): Promise<string[]> {
        const foreignKeys = await this.foreignKeys(undefined, dbConfig);

        // Build dependency graph
        const graph: DependencyGraph = {};

        for (const fk of foreignKeys) {
            if (!graph[fk.childTable]) {
                graph[fk.childTable] = [];
            }
            if (!graph[fk.childTable].includes(fk.parentTable)) {
                graph[fk.childTable].push(fk.parentTable);
            }
        }

        // Perform topological sort
        const visited = new Set<string>();
        const result: string[] = [];

        function visit(table: string) {
            if (!visited.has(table)) {
                visited.add(table);
                const parents = graph[table] || [];
                parents.forEach(visit);
                result.push(table);
            }
        }

        // Visit all child tables
        Object.keys(graph).forEach(visit);

        // Include all tables (both parents and children)
        const allTables = new Set([
            ...Object.keys(graph),
            ...Object.values(graph).flat()
        ]);

        // Add orphan tables (tables with no dependencies)
        for (const table of allTables) {
            if (!visited.has(table)) {
                result.push(table);
            }
        }

        // Reverse to get child-first order and remove duplicates
        return [...new Set(result)].reverse();
    }
};

export default schema;
export { schema };
