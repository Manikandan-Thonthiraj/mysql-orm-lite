import { QueryMetric, PerformanceStats, ConnectionPoolStats } from '../types';

class PerformanceMonitor {
    private enabled: boolean = false;
    private queries: QueryMetric[] = [];
    private startTime: number = 0;
    private queryCountByType = {
        SELECT: 0,
        INSERT: 0,
        UPDATE: 0,
        DELETE: 0,
        OTHER: 0
    };

    /**
     * Enable performance monitoring
     */
    enable(): void {
        this.enabled = true;
        this.startTime = Date.now();
        console.log('[Performance Monitor] Enabled');
    }

    /**
     * Disable performance monitoring
     */
    disable(): void {
        this.enabled = false;
        console.log('[Performance Monitor] Disabled');
    }

    /**
     * Check if monitoring is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Record a query execution
     */
    recordQuery(query: string, duration: number, params?: any[]): void {
        if (!this.enabled) return;

        const type = this.detectQueryType(query);

        const metric: QueryMetric = {
            query,
            duration,
            timestamp: Date.now(),
            type,
            params
        };

        this.queries.push(metric);
        this.queryCountByType[type]++;

        // Keep only last 1000 queries to prevent memory issues
        if (this.queries.length > 1000) {
            this.queries.shift();
        }
    }

    /**
     * Detect query type from SQL string
     */
    private detectQueryType(query: string): QueryMetric['type'] {
        const normalized = query.trim().toUpperCase();

        if (normalized.startsWith('SELECT')) return 'SELECT';
        if (normalized.startsWith('INSERT')) return 'INSERT';
        if (normalized.startsWith('UPDATE')) return 'UPDATE';
        if (normalized.startsWith('DELETE')) return 'DELETE';

        return 'OTHER';
    }

    /**
     * Get current performance statistics
     */
    getStats(): PerformanceStats {
        const totalQueries = this.queries.length;
        const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
        const averageQueryTime = totalQueries > 0 ? totalDuration / totalQueries : 0;

        const slowestQueries = [...this.queries]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        return {
            enabled: this.enabled,
            totalQueries,
            averageQueryTime: Math.round(averageQueryTime * 100) / 100,
            slowestQueries,
            queryCountByType: { ...this.queryCountByType },
            startTime: this.startTime,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Get slowest queries
     */
    getSlowQueries(limit: number = 10): QueryMetric[] {
        return [...this.queries]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    /**
     * Reset all collected metrics
     */
    reset(): void {
        this.queries = [];
        this.queryCountByType = {
            SELECT: 0,
            INSERT: 0,
            UPDATE: 0,
            DELETE: 0,
            OTHER: 0
        };
        this.startTime = Date.now();
        console.log('[Performance Monitor] Reset');
    }

    /**
     * Get queries executed in the last N milliseconds
     */
    getRecentQueries(milliseconds: number = 60000): QueryMetric[] {
        const cutoff = Date.now() - milliseconds;
        return this.queries.filter(q => q.timestamp >= cutoff);
    }

    /**
     * Get queries per second
     */
    getQueriesPerSecond(): number {
        const uptime = this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;
        return uptime > 0 ? this.queries.length / uptime : 0;
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
export { performanceMonitor, PerformanceMonitor };
