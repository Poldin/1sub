import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import AdminUsersPage from '@/app/admin/users/page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock useUser hook
vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Admin Users Management', () => {
  const mockPush = vi.fn();
  const mockUseUser = vi.mocked(useUser);
  const mockUseRouter = vi.mocked(useRouter);

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin',
    balance: 1000,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockUsers = [
    {
      id: '1',
      email: 'user1@example.com',
      full_name: 'User One',
      role: 'user',
      balance: 100,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'user2@example.com',
      full_name: 'User Two',
      role: 'user',
      balance: 50,
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      email: 'admin2@example.com',
      full_name: 'Admin Two',
      role: 'admin',
      balance: 200,
      created_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Start with loading: false to avoid the loading state issue
    mockUseUser.mockReturnValue({
      user: mockAdminUser,
      loading: false,
    });
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    // Reset fetch mock
    (global.fetch as any).mockClear();
    // Set up default successful fetch response - use mockImplementation to match URL pattern
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });
  });

  it('should render users table correctly', async () => {
    // Add debugging to see if fetch is called
    const fetchSpy = vi.spyOn(global, 'fetch');

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for fetch to be called
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Wait for users to be displayed
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getAllByText('Role')).toHaveLength(2); // One in filter, one in table header
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should show credit adjustment dialog when adjust button is clicked', async () => {
    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Find and click adjust credits button for first user
    const adjustButtons = screen.getAllByText('Adjust Credits');
    fireEvent.click(adjustButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Adjust Credits for User One')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    });
  });

  it('should validate credit adjustment form', async () => {
    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Open adjust credits dialog
    const adjustButtons = screen.getAllByText('Adjust Credits');
    fireEvent.click(adjustButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Adjust Credits for User One')).toBeInTheDocument();
    });

    // Try to submit empty form
    fireEvent.click(screen.getByText('Adjust Credits'));

    await waitFor(() => {
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
      expect(screen.getByText('Reason is required')).toBeInTheDocument();
    });
  });

  it('should adjust credits successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers.map(u => u.id === '1' ? { ...u, balance: 150 } : u), total: mockUsers.length, totalPages: 1 }),
      });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Open adjust credits dialog
    const adjustButtons = screen.getAllByText('Adjust Credits');
    fireEvent.click(adjustButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Adjust Credits for User One')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Test credit adjustment' },
    });

    // Submit form
    fireEvent.click(screen.getByText('Adjust Credits'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/admin/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '1',
          amount: 50,
          reason: 'Test credit adjustment',
          adminId: 'admin-1',
        }),
      });
    });

    // Should close dialog
    await waitFor(() => {
      expect(screen.queryByText('Adjust Credits for User One')).not.toBeInTheDocument();
    });
  });

  it('should filter users by role', async () => {
    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers.filter(u => u.role === 'user'), total: 2, totalPages: 1 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Filter by role
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'user' } });

    // Should only show users with 'user' role
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
      expect(screen.queryByText('Admin Two')).not.toBeInTheDocument();
    });
  });

  it('should filter users by balance range', async () => {
    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers.filter(u => u.balance >= 75 && u.balance <= 150), total: 1, totalPages: 1 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load first
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Wait for the form elements to be available
    await waitFor(() => {
      expect(screen.getByLabelText('Min Balance')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Balance')).toBeInTheDocument();
    });

    // Set balance range filters
    fireEvent.change(screen.getByLabelText('Min Balance'), {
      target: { value: '75' },
    });
    fireEvent.change(screen.getByLabelText('Max Balance'), {
      target: { value: '150' },
    });

    // Should only show users within balance range
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Two')).not.toBeInTheDocument();
    });
  });

  it('should search users by name or email', async () => {
    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers.filter(u => u.full_name.includes('User One') || u.email.includes('User One')), total: 1, totalPages: 1 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Search for specific user
    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'User One' },
    });

    // Should only show matching users
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Two')).not.toBeInTheDocument();
    });
  });

  it('should show pagination controls', async () => {
    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ users: mockUsers, total: 30, totalPages: 3 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Check pagination controls
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers, total: mockUsers.length, totalPages: 1 }),
      });
    });

    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Error loading users')).toBeInTheDocument();
    });
  });

  it('should clear filters when clear button is clicked', async () => {
    await act(async () => {
      render(<AdminUsersPage />);
    });

    // Wait for users to load first
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Wait for the form elements to be available
    await waitFor(() => {
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText('Min Balance')).toBeInTheDocument();
    });

    // Apply filters
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('Min Balance'), { target: { value: '75' } });

    // Clear filters
    fireEvent.click(screen.getByText('Clear Filters'));

    // Should reset all filter values
    expect(screen.getByLabelText('Role')).toHaveValue('');
    expect(screen.getByLabelText('Min Balance')).toHaveValue('');
    expect(screen.getByLabelText('Max Balance')).toHaveValue('');
    expect(screen.getByPlaceholderText('Search users...')).toHaveValue('');
  });
});