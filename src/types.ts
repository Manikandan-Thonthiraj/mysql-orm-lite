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
