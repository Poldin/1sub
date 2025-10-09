'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  balance: number;
}

interface CreditAdjustmentData {
  amount: number;
  reason: string;
}

export default function UsersManagement() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustmentData, setAdjustmentData] = useState<CreditAdjustmentData>({
    amount: 0,
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    amount?: string;
    reason?: string;
  }>({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    minBalance: '',
    maxBalance: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
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
    
    fetchUsers();
  }, [filters, user, userLoading, router, pagination.page]);

  const fetchUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.minBalance) params.append('min_balance', filters.minBalance);
      if (filters.maxBalance) params.append('max_balance', filters.maxBalance);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('userId', user.id);

      const response = await fetch(`/api/v1/admin/users?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/backoffice');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditAdjustment = async () => {
    if (!selectedUser) return;

    // Validate form
    const errors: { amount?: string; reason?: string } = {};
    if (adjustmentData.amount === 0) {
      errors.amount = 'Amount is required';
    }
    if (!adjustmentData.reason.trim()) {
      errors.reason = 'Reason is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          amount: adjustmentData.amount,
          reason: adjustmentData.reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to adjust credits');
        return;
      }

      await fetchUsers();
      setIsAdjustmentDialogOpen(false);
      setSelectedUser(null);
      setAdjustmentData({ amount: 0, reason: '' });
    } catch (error) {
      console.error('Error adjusting credits:', error);
      alert('Failed to adjust credits');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustmentDialog = (user: User) => {
    setSelectedUser(user);
    setIsAdjustmentDialogOpen(true);
  };

  const closeAdjustmentDialog = () => {
    setIsAdjustmentDialogOpen(false);
    setSelectedUser(null);
    setAdjustmentData({ amount: 0, reason: '' });
    setValidationErrors({});
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      minBalance: '',
      maxBalance: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e] mx-auto mb-4"></div>
          <p className="text-[#ededed]">Loading...</p>
        </div>
      </div>
    );
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
              <h1 className="text-2xl font-bold text-[#ededed]">Users Management</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#ededed]">Filters</h2>
            <Button
              variant="secondary"
              onClick={clearFilters}
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search users..."
            />
            <Select
              label="Role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
            <Input
              label="Min Balance"
              type="number"
              value={filters.minBalance}
              onChange={(e) => setFilters({ ...filters, minBalance: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Max Balance"
              type="number"
              value={filters.maxBalance}
              onChange={(e) => setFilters({ ...filters, maxBalance: e.target.value })}
              placeholder="1000"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users || users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#9ca3af] py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium">{user.full_name || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-[#9ca3af]">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-[#3ecf8e]">
                        {user.balance.toFixed(2)} credits
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openAdjustmentDialog(user)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors text-sm"
                          >
                            Adjust Credits
                          </button>
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="text-[#9ca3af] hover:text-[#ededed] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#374151]">
              <div className="text-sm text-[#9ca3af]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-[#ededed]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit Adjustment Dialog */}
      <Dialog
        open={isAdjustmentDialogOpen}
        onOpenChange={setIsAdjustmentDialogOpen}
      >
        <div className="bg-[#1f2937] rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-xl font-bold mb-4">Adjust Credits for {selectedUser?.full_name || selectedUser?.email}</h3>
          <div className="space-y-4">
          <div className="bg-[#374151] rounded-lg p-4">
            <p className="text-sm text-[#9ca3af]">Current Balance</p>
            <p className="text-xl font-bold text-[#3ecf8e]">
              {selectedUser?.balance.toFixed(2)} credits
            </p>
          </div>
          
          <Input
            label="Amount"
            type="number"
            value={adjustmentData.amount}
            onChange={(e) => setAdjustmentData({ ...adjustmentData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="Enter amount (positive to add, negative to subtract)"
            step="0.01"
            required
            error={validationErrors.amount}
          />
          
          <Input
            label="Reason"
            value={adjustmentData.reason}
            onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
            placeholder="Reason for adjustment"
            required
            error={validationErrors.reason}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={closeAdjustmentDialog}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreditAdjustment}
              disabled={submitting || adjustmentData.amount === 0 || !adjustmentData.reason}
            >
              {submitting ? 'Processing...' : 'Adjust Credits'}
            </Button>
          </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
