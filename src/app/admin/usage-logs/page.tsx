'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Calendar } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';

interface UsageLog {
  id: string;
  credits_consumed: number;
  status: 'success' | 'failed' | 'insufficient_credits';
  metadata: Record<string, unknown>;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  tool: {
    id: string;
    name: string;
  } | null;
}

export default function UsageLogs() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    toolId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (userLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/backoffice');
      return;
    }
    
    fetchLogs();
  }, [filters, user, userLoading, router]);

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('user_id', filters.userId);
      if (filters.toolId) params.append('tool_id', filters.toolId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      params.append('userId', user.id);

      const response = await fetch(`/api/v1/admin/usage-logs?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/backoffice');
          return;
        }
        throw new Error('Failed to fetch usage logs');
      }

      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching usage logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      toolId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'insufficient_credits':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e] mx-auto mb-4"></div>
          <p className="text-[#ededed]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 text-[#9ca3af] hover:text-[#ededed] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-[#ededed]">Usage Logs</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#ededed] flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h2>
            <Button
              variant="secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="User ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Filter by user ID"
            />
            
            <Input
              label="Tool ID"
              value={filters.toolId}
              onChange={(e) => setFilters({ ...filters, toolId: e.target.value })}
              placeholder="Filter by tool ID"
            />
            
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
                { value: 'insufficient_credits', label: 'Insufficient Credits' }
              ]}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Usage Logs Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Usage Logs</h2>
            <p className="text-sm text-[#9ca3af] mt-1">
              Showing {logs.length} log entries
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#9ca3af] py-8">
                      No usage logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.user.full_name || 'N/A'}</p>
                          <p className="text-sm text-[#9ca3af]">{log.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.tool ? (
                          <span className="text-[#ededed]">{log.tool.name}</span>
                        ) : (
                          <span className="text-[#9ca3af]">Unknown Tool</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-[#3ecf8e]">
                        {log.credits_consumed} credits
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        <div>
                          <p>{new Date(log.created_at).toLocaleDateString()}</p>
                          <p className="text-xs">{new Date(log.created_at).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-[#3ecf8e] hover:text-[#2dd4bf]">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-[#374151] rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-[#9ca3af]">No details</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
