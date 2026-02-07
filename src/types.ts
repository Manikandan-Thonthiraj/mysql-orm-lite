export interface DbConfig {
    host?: string;
    user?: string;
    password?: string;
    database?: string;
    port?: number;
    connectionLimit?: number;
    [key: string]: any;
}

export interface Logger {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
}

export interface JoinOptions {
    type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    table: string;
    alias?: string;
    on: string | string[];
}

export interface WhereConditions {
    [key: string]: any;
}

export interface SelectOptions {
    table: string;
    fields?: string | string[];
    joins?: JoinOptions[];
    where?: WhereConditions;
    orderBy?: string;
    limit?: number;
    offset?: number;
    groupBy?: string;
    having?: string;
    alias?: string;
    forUpdate?: boolean;
}

export interface UpdateOptions {
    table: string;
    data: Record<string, any>;
    where?: WhereConditions;
}

export interface DeleteOptions {
    table: string;
    where: WhereConditions;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string | null;
    extra: string;
}

export interface IndexInfo {
    name: string;
    column: string;
    unique: boolean;
    type: string;
}

export interface ForeignKeyInfo {
    childTable: string;
    parentTable: string;
    constraintName: string;
    columnName: string;
    referencedColumnName: string;
}

export interface DependencyGraph {
    [childTable: string]: string[];
}

export interface QueryMetric {
    query: string;
    duration: number;
    timestamp: number;
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
    params?: any[];
}

export interface ConnectionPoolStats {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    waitingRequests: number;
}

export interface PerformanceStats {
    enabled: boolean;
    totalQueries: number;
    averageQueryTime: number;
    slowestQueries: QueryMetric[];
    queryCountByType: {
        SELECT: number;
        INSERT: number;
        UPDATE: number;
        DELETE: number;
        OTHER: number;
    };
    startTime: number;
    uptime: number;
}

export interface BulkInsertOptions {
    batchSize?: number;
    ignore?: boolean;
}

export interface BulkInsertResult {
    totalInserted: number;
    batches: number;
    firstInsertId?: number;
    lastInsertId?: number;
}

export interface UpsertOptions {
    conflictKey: string | string[];
    updateFields?: string[];
}

export interface UpsertResult {
    action: 'inserted' | 'updated';
    affectedRows: number;
    insertId?: number;
}

export interface BulkUpsertOptions extends BulkInsertOptions {
    conflictKey: string | string[];
    updateFields?: string[];
}

export interface BulkUpsertResult {
    totalAffected: number;
    batches: number;
}
