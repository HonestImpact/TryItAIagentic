/**
 * Performance Profiling for Agentic Services
 *
 * Tracks latency and call counts for each service method to identify bottlenecks.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('performance');

export interface PerformanceMetric {
  method: string;
  service: string;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  callCount: number;
  totalTime: number;
}

class PerformanceTracker {
  private metrics = new Map<string, {
    totalTime: number;
    count: number;
    min: number;
    max: number;
  }>();

  /**
   * Record a service method execution time
   */
  record(service: string, method: string, durationMs: number): void {
    const key = `${service}.${method}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.totalTime += durationMs;
      existing.count += 1;
      existing.min = Math.min(existing.min, durationMs);
      existing.max = Math.max(existing.max, durationMs);
    } else {
      this.metrics.set(key, {
        totalTime: durationMs,
        count: 1,
        min: durationMs,
        max: durationMs
      });
    }
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    const results: PerformanceMetric[] = [];

    for (const [key, data] of this.metrics.entries()) {
      const [service, method] = key.split('.');
      results.push({
        service,
        method,
        avgLatency: data.totalTime / data.count,
        minLatency: data.min,
        maxLatency: data.max,
        callCount: data.count,
        totalTime: data.totalTime
      });
    }

    // Sort by total time (descending) to show biggest bottlenecks first
    return results.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(service: string): PerformanceMetric[] {
    return this.getMetrics().filter(m => m.service === service);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const metrics = this.getMetrics();
    return {
      totalCalls: metrics.reduce((sum, m) => sum + m.callCount, 0),
      totalTime: metrics.reduce((sum, m) => sum + m.totalTime, 0),
      slowestMethod: metrics[0] || null,
      methodCount: metrics.length
    };
  }
}

// Global singleton
export const performanceTracker = new PerformanceTracker();

/**
 * Decorator to automatically track method performance
 */
export function trackPerformance(service: string, method: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        performanceTracker.record(service, method, duration);

        // Log slow operations (>1000ms)
        if (duration > 1000) {
          logger.warn(`Slow operation: ${service}.${method} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        performanceTracker.record(service, method, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Manually track performance for a function call
 */
export async function measurePerformance<T>(
  service: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    performanceTracker.record(service, method, duration);

    if (duration > 1000) {
      logger.warn(`Slow operation: ${service}.${method} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceTracker.record(service, method, duration);
    throw error;
  }
}
