'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  credit_cost_per_use: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ToolFormData {
  name: string;
  description: string;
  url: string;
  credit_cost_per_use: number;
  is_active: boolean;
}

export default function ToolsManagement() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState<ToolFormData>({
    name: '',
    description: '',
    url: '',
    credit_cost_per_use: 1,
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

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
    
    fetchTools();
  }, [user, userLoading, router]);

  // Filter tools based on search term and status
  useEffect(() => {
    let filtered = tools;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tool => 
        statusFilter === 'active' ? tool.is_active : !tool.is_active
      );
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, statusFilter]);

  const fetchTools = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/admin/tools?userId=${user.id}`);
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/backoffice');
          return;
        }
        throw new Error('Failed to fetch tools');
      }

      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      setError('Error loading tools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTool = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create tool');
        return;
      }

      await fetchTools();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating tool:', error);
      alert('Failed to create tool');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTool = async () => {
    if (!editingTool) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/admin/tools/${editingTool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update tool');
        return;
      }

      await fetchTools();
      setEditingTool(null);
      resetForm();
    } catch (error) {
      console.error('Error updating tool:', error);
      alert('Failed to update tool');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateTool = async (tool: Tool) => {
    if (!confirm(`Are you sure you want to deactivate "${tool.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/tools/${tool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to deactivate tool');
        return;
      }

      await fetchTools();
    } catch (error) {
      console.error('Error deactivating tool:', error);
      alert('Failed to deactivate tool');
    }
  };

  const handleDeleteTool = async (tool: Tool) => {
    if (!confirm(`Are you sure you want to delete "${tool.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/tools/${tool.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete tool');
        return;
      }

      await fetchTools();
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert('Failed to delete tool');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      credit_cost_per_use: 1,
      is_active: true
    });
  };

  const openEditDialog = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
      url: tool.url,
      credit_cost_per_use: tool.credit_cost_per_use,
      is_active: tool.is_active
    });
  };

  const closeEditDialog = () => {
    setEditingTool(null);
    resetForm();
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
    return null; // Will redirect via useEffect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTools}
            className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
          >
            Try Again
          </button>
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
              <h1 className="text-2xl font-bold text-[#ededed]">Tools Management</h1>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tools Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#ededed]">All Tools</h2>
              <div className="flex items-center space-x-4">
                {/* Search Input */}
                <Input
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredTools || filteredTools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#9ca3af] py-8">
                      {tools.length === 0 ? 'No tools found' : 'No tools match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTools.map((tool) => (
                    <TableRow key={tool.id} data-testid="tool-row">
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell className="text-[#9ca3af] max-w-xs truncate">
                        {tool.description}
                      </TableCell>
                      <TableCell className="text-[#9ca3af] max-w-xs truncate">
                        {tool.url}
                      </TableCell>
                      <TableCell className="font-medium text-[#3ecf8e]">
                        {tool.credit_cost_per_use} credits
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tool.is_active 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tool.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditDialog(tool)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {tool.is_active && (
                            <button
                              onClick={() => handleDeactivateTool(tool)}
                              className="text-red-400 hover:text-red-300 transition-colors text-sm"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTool(tool)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Tool Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <div className="bg-[#1f2937] rounded-lg p-6 max-w-lg mx-auto">
          <h3 className="text-xl font-bold mb-4">Create New Tool</h3>
          <div className="space-y-4">
          <Input
            label="Tool Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter tool name"
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter tool description"
          />
          <Input
            label="URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com/tool"
            required
          />
          <Input
            label="Credit Cost"
            type="number"
            value={formData.credit_cost_per_use}
            onChange={(e) => setFormData({ ...formData, credit_cost_per_use: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            required
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-[#4b5563] bg-[#374151] text-[#3ecf8e] focus:ring-[#3ecf8e]"
            />
            <label htmlFor="is_active" className="text-sm text-[#ededed]">
              Active
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTool}
              disabled={submitting || !formData.name || !formData.url}
            >
              {submitting ? 'Creating...' : 'Create Tool'}
            </Button>
          </div>
          </div>
        </div>
      </Dialog>

      {/* Edit Tool Dialog */}
      <Dialog
        open={!!editingTool}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <div className="bg-[#1f2937] rounded-lg p-6 max-w-lg mx-auto">
          <h3 className="text-xl font-bold mb-4">Edit Tool</h3>
        <div className="space-y-4">
          <Input
            label="Tool Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter tool name"
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter tool description"
          />
          <Input
            label="URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com/tool"
            required
          />
          <Input
            label="Credit Cost"
            type="number"
            value={formData.credit_cost_per_use}
            onChange={(e) => setFormData({ ...formData, credit_cost_per_use: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            required
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-[#4b5563] bg-[#374151] text-[#3ecf8e] focus:ring-[#3ecf8e]"
            />
            <label htmlFor="edit_is_active" className="text-sm text-[#ededed]">
              Active
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={closeEditDialog}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTool}
              disabled={submitting || !formData.name || !formData.url}
            >
              {submitting ? 'Updating...' : 'Update Tool'}
            </Button>
          </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
