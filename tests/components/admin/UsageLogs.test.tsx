import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUser } from '@/hooks/useUser';
import AdminUsageLogsPage from '@/app/admin/usage-logs/page';

// Mock the useUser hook
vi.mock('@/hooks/useUser');
const mockUseUser = vi.mocked(useUser);

// Mock fetch
global.fetch = vi.fn();

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Admin Usage Logs', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin' as const,
  };

  const mockUsageLogs = [
    {
      id: '1',
      user_id: 'user-1',
      tool_id: 'tool-1',
      status: 'success',
      credits_consumed: 5,
      response_time_ms: 1000,
      created_at: '2024-01-01T10:00:00Z',
      user: {
        email: 'user1@example.com',
        full_name: 'User One',
      },
      tool: {
        name: 'Test Tool 1',
      },
    },
    {
      id: '2',
      user_id: 'user-2',
      tool_id: 'tool-2',
      status: 'error',
      credits_consumed: 0,
      response_time_ms: 500,
      created_at: '2024-01-01T11:00:00Z',
      user: {
        email: 'user2@example.com',
        full_name: 'User Two',
      },
      tool: {
        name: 'Test Tool 2',
      },
    },
    {
      id: '3',
      user_id: 'user-1',
      tool_id: 'tool-1',
      status: 'success',
      credits_consumed: 10,
      response_time_ms: 2000,
      created_at: '2024-01-01T12:00:00Z',
      user: {
        email: 'user1@example.com',
        full_name: 'User One',
      },
      tool: {
        name: 'Test Tool 1',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: mockAdminUser,
      loading: false,
    });
  });

  it('should render usage logs table correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Credits')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('should filter logs by status', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Filter by success status
    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'success' } });

    // Should only show success logs
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should filter logs by user', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Filter by specific user
    const userFilter = screen.getByLabelText('User');
    fireEvent.change(userFilter, { target: { value: 'user-1' } });

    // Should only show logs for user-1
    await waitFor(() => {
      expect(screen.getAllByText('User One')).toHaveLength(2); // Two logs for user-1
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should filter logs by tool', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Filter by specific tool
    const toolFilter = screen.getByLabelText('Tool');
    fireEvent.change(toolFilter, { target: { value: 'tool-1' } });

    // Should only show logs for tool-1
    await waitFor(() => {
      expect(screen.getAllByText('User One')).toHaveLength(2); // Two logs for tool-1
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should filter logs by date range', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Filter by date range
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2024-01-01' },
    });

    // Apply filters
    fireEvent.click(screen.getByText('Apply Filters'));

    // Should show logs within date range
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });
  });

  it('should show pagination controls', async () => {
    // Create a large list of logs for pagination testing
    const manyLogs = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      user_id: `user-${i + 1}`,
      tool_id: `tool-${i + 1}`,
      status: 'success',
      credits_consumed: 5,
      response_time_ms: 1000,
      created_at: '2024-01-01T00:00:00Z',
      user: {
        email: `user${i + 1}@example.com`,
        full_name: `User ${i + 1}`,
      },
      tool: {
        name: `Tool ${i + 1}`,
      },
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: manyLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    // Check pagination controls
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should clear filters when clear button is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Apply filters
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'success' } });
    fireEvent.change(screen.getByLabelText('User'), { target: { value: 'user-1' } });

    // Clear filters
    fireEvent.click(screen.getByText('Clear Filters'));

    // Should show all logs again
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });
  });

  it('should display status badges correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Check status badges
    const successBadges = screen.getAllByText('Success');
    const errorBadges = screen.getAllByText('Error');
    
    expect(successBadges).toHaveLength(2); // Two success logs
    expect(errorBadges).toHaveLength(1); // One error log
  });

  it('should format response time correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Check response time formatting
    expect(screen.getByText('1.0s')).toBeInTheDocument();
    expect(screen.getByText('0.5s')).toBeInTheDocument();
    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Check date formatting (assuming it shows relative time or formatted date)
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error loading usage logs')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    mockUseUser.mockReturnValue({
      user: mockAdminUser,
      loading: true,
    });

    render(<AdminUsageLogsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect non-admin users', () => {
    mockUseUser.mockReturnValue({
      user: { ...mockAdminUser, role: 'user' },
      loading: false,
    });

    render(<AdminUsageLogsPage />);

    expect(mockPush).toHaveBeenCalledWith('/backoffice');
  });

  it('should redirect unauthenticated users', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AdminUsageLogsPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should export logs functionality', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockUsageLogs }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText('Export Logs');
    fireEvent.click(exportButton);

    // Should trigger download (this would be mocked in real implementation)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/usage-logs/export'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  it('should show empty state when no logs', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: [] }),
    });

    render(<AdminUsageLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('No usage logs found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or check back later.')).toBeInTheDocument();
    });
  });
});
