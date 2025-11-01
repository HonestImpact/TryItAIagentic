'use client';

/**
 * Analytics Dashboard
 *
 * Visualizes agentic service metrics:
 * - Learning statistics (successes, confidence, patterns)
 * - Security metrics (violations, trust scores)
 *
 * Data updates in real-time from /api/analytics
 */

import { useState, useEffect } from 'react';

interface LearningStats {
  totalSuccesses: number;
  averageConfidence: number;
  averageIterations: number;
  averageTime: number;
  topPatterns: Array<{ pattern: string; count: number }>;
}

interface SecurityMetrics {
  totalValidations: number;
  blocked: number;
  warned: number;
  allowed: number;
  averageTrustScore: number;
}

interface AnalyticsData {
  learning: LearningStats | null;
  security: SecurityMetrics | null;
  timestamp: string;
  error?: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics');
        const result = await response.json();
        setData(result);
        setError(result.error || null);
      } catch (err) {
        setError('Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Agentic Services Analytics</h1>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">{error}</p>
            <p className="text-yellow-600 text-sm mt-1">
              Services initialize after first Tinkerer workflow. Try building something complex!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Service Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📚 Learning Service</h2>

            {data?.learning ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Total Successes"
                    value={data.learning.totalSuccesses}
                    suffix="workflows"
                  />
                  <StatCard
                    label="Avg Confidence"
                    value={(data.learning.averageConfidence * 100).toFixed(0)}
                    suffix="%"
                  />
                  <StatCard
                    label="Avg Iterations"
                    value={data.learning.averageIterations.toFixed(1)}
                    suffix="per workflow"
                  />
                  <StatCard
                    label="Avg Time"
                    value={(data.learning.averageTime / 1000).toFixed(1)}
                    suffix="seconds"
                  />
                </div>

                {data.learning.topPatterns.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Top Patterns</h3>
                    <div className="space-y-2">
                      {data.learning.topPatterns.map((p, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{p.pattern}</span>
                          <span className="text-sm font-medium text-gray-900">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No learning data yet</div>
            )}
          </div>

          {/* Security Service Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🛡️ Security Service</h2>

            {data?.security ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Total Validations"
                    value={data.security.totalValidations}
                    suffix="checks"
                  />
                  <StatCard
                    label="Avg Trust Score"
                    value={(data.security.averageTrustScore * 100).toFixed(0)}
                    suffix="%"
                  />
                  <StatCard
                    label="Blocked"
                    value={data.security.blocked}
                    suffix="requests"
                    color="red"
                  />
                  <StatCard
                    label="Warned"
                    value={data.security.warned}
                    suffix="requests"
                    color="yellow"
                  />
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Allowed</span>
                    <span className="text-sm font-medium text-green-600">
                      {data.security.allowed} requests
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No security data yet</div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {data?.timestamp && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  color = 'blue'
}: {
  label: string;
  value: number | string;
  suffix: string;
  color?: 'blue' | 'red' | 'yellow';
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-gray-500">{suffix}</div>
    </div>
  );
}
