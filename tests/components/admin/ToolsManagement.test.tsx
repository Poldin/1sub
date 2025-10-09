import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUser } from '@/hooks/useUser';
import AdminToolsPage from '@/app/admin/tools/page';

// Mock the useUser hook
vi.mock('@/hooks/useUser');
const mockUseUser = vi.mocked(useUser);

// Mock fetch
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ tools: [] }),
  })
);

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Admin Tools Management', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin' as const,
  };

  const mockTools = [
    {
      id: '1',
      name: 'Test Tool 1',
      description: 'A test tool',
      url: 'https://example.com/tool1',
      credit_cost_per_use: 5,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Test Tool 2',
      description: 'Another test tool',
      url: 'https://example.com/tool2',
      credit_cost_per_use: 10,
      is_active: false,
      created_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: mockAdminUser,
      loading: false,
    });
    
    // Reset fetch mock to default implementation
    (global.fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ tools: [] }),
      })
    );
  });

  it('should render tools table correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tool 2')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should show create tool dialog when create button is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Tool');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Tool')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('URL')).toBeInTheDocument();
      expect(screen.getByLabelText('Credit Cost')).toBeInTheDocument();
    });
  });

  it('should validate create tool form', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
    });

    // Open create dialog
    fireEvent.click(screen.getByText('Create Tool'));

    await waitFor(() => {
      expect(screen.getByText('Create New Tool')).toBeInTheDocument();
    });

    // Try to submit empty form
    fireEvent.click(screen.getByText('Create Tool'));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('URL is required')).toBeInTheDocument();
      expect(screen.getByText('Credit cost is required')).toBeInTheDocument();
    });
  });

  it('should create tool successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: [...mockTools, { id: '3', name: 'New Tool' }] }),
      });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
    });

    // Open create dialog
    fireEvent.click(screen.getByText('Create Tool'));

    await waitFor(() => {
      expect(screen.getByText('Create New Tool')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New Tool' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'A new test tool' },
    });
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com/new-tool' },
    });
    fireEvent.change(screen.getByLabelText('Credit Cost'), {
      target: { value: '7' },
    });

    // Submit form
    fireEvent.click(screen.getByText('Create Tool'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/admin/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Tool',
          description: 'A new test tool',
          url: 'https://example.com/new-tool',
          credit_cost_per_use: 7,
          is_active: true,
        }),
      });
    });
  });

  it('should show edit tool dialog when edit button is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
    });

    // Find and click edit button for first tool
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Tool')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Tool 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test tool')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com/tool1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });
  });

  it('should deactivate tool successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
    });

    // Find and click deactivate button for first tool
    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    // Confirm deactivation
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to deactivate this tool?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/admin/tools/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
    });
  });

  it('should show loading state', () => {
    mockUseUser.mockReturnValue({
      user: mockAdminUser,
      loading: true,
    });

    render(<AdminToolsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect non-admin users', () => {
    mockUseUser.mockReturnValue({
      user: { ...mockAdminUser, role: 'user' },
      loading: false,
    });

    render(<AdminToolsPage />);

    expect(mockPush).toHaveBeenCalledWith('/backoffice');
  });

  it('should redirect unauthenticated users', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AdminToolsPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error loading tools')).toBeInTheDocument();
    });
  });

  it('should filter tools by status', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tool 2')).toBeInTheDocument();
    });

    // Filter by active status
    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    // Should only show active tools
    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Tool 2')).not.toBeInTheDocument();
    });
  });

  it('should search tools by name', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    });

    render(<AdminToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tool 2')).toBeInTheDocument();
    });

    // Search for specific tool
    const searchInput = screen.getByPlaceholderText('Search tools...');
    fireEvent.change(searchInput, { target: { value: 'Tool 1' } });

    // Should only show matching tools
    await waitFor(() => {
      expect(screen.getByText('Test Tool 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Tool 2')).not.toBeInTheDocument();
    });
  });
});
