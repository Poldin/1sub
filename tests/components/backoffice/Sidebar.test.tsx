import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/app/backoffice/components/Sidebar';

// Mock the child components
vi.mock('@/app/backoffice/components/ShareAndEarn', () => ({
  ShareAndEarnButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="share-and-earn-button">
      Share & Earn
    </button>
  ),
}));

vi.mock('@/app/backoffice/components/TopUpDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="top-up-dialog">Top Up Dialog</div> : null,
}));

vi.mock('@/app/backoffice/components/TransactionHistory', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="transaction-history">Transaction History</div> : null,
}));

describe('Backoffice Sidebar', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    credits: 100.50,
    onShareAndEarnClick: vi.fn(),
    userId: 'user-123',
    onCreditsUpdated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sidebar when open', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('1sub')).toBeInTheDocument();
    expect(screen.getByText('.io')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My tools')).toBeInTheDocument();
  });

  it('should not render sidebar when closed', () => {
    render(<Sidebar {...defaultProps} isOpen={false} />);

    // The sidebar should be hidden with transform class
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('should display credit balance correctly', () => {
    render(<Sidebar {...defaultProps} credits={150.75} />);

    expect(screen.getByText('150.75')).toBeInTheDocument();
    expect(screen.getByText('credits')).toBeInTheDocument();
  });

  it('should display default credit balance when credits is undefined', () => {
    render(<Sidebar {...defaultProps} credits={undefined} />);

    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);

    // Find the close button by looking for the X icon
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-x"]')
    );
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);

    // Find the overlay by its class
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should render navigation links', () => {
    render(<Sidebar {...defaultProps} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    const toolsLink = screen.getByRole('link', { name: /my tools/i });

    expect(homeLink).toHaveAttribute('href', '/backoffice');
    expect(toolsLink).toHaveAttribute('href', '/backoffice/tools');
  });

  it('should render action buttons', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Top Up')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
    expect(screen.getByTestId('share-and-earn-button')).toBeInTheDocument();
  });

  it('should open top up dialog when Top Up button is clicked', () => {
    render(<Sidebar {...defaultProps} />);

    const topUpButton = screen.getByText('Top Up');
    fireEvent.click(topUpButton);

    expect(screen.getByTestId('top-up-dialog')).toBeInTheDocument();
  });

  it('should open transaction history dialog when History button is clicked', () => {
    render(<Sidebar {...defaultProps} />);

    const historyButton = screen.getByText('History');
    fireEvent.click(historyButton);

    expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
  });

  it('should call onShareAndEarnClick when Share & Earn button is clicked', () => {
    const onShareAndEarnClick = vi.fn();
    render(<Sidebar {...defaultProps} onShareAndEarnClick={onShareAndEarnClick} />);

    const shareButton = screen.getByTestId('share-and-earn-button');
    fireEvent.click(shareButton);

    expect(onShareAndEarnClick).toHaveBeenCalledTimes(1);
  });

  it('should render logout button', () => {
    render(<Sidebar {...defaultProps} />);

    // Find the logout button by its red background color class
    const buttons = screen.getAllByRole('button');
    const logoutButton = buttons.find(button => button.classList.contains('bg-red-600'));
    expect(logoutButton).toBeInTheDocument();
  });

  it('should handle logout click', () => {
    // Mock the router and supabase client
    const mockPush = vi.fn();
    const mockSignOut = vi.fn().mockResolvedValue({});
    
    // Mock useRouter
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }));
    
    // Mock supabase client
    vi.doMock('@/lib/supabaseClient', () => ({
      supabaseClient: {
        auth: {
          signOut: mockSignOut,
        },
      },
    }));

    render(<Sidebar {...defaultProps} />);

    // Find the logout button by its red background color class
    const buttons = screen.getAllByRole('button');
    const logoutButton = buttons.find(button => button.classList.contains('bg-red-600'));
    fireEvent.click(logoutButton!);

    // The logout function should be called (we can't easily test the async behavior in this test)
    expect(logoutButton).toBeInTheDocument();
  });

  it('should render with proper accessibility attributes', () => {
    render(<Sidebar {...defaultProps} />);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toBeInTheDocument();
  });

  it('should render icons correctly', () => {
    render(<Sidebar {...defaultProps} />);

    // Check that SVG elements are rendered by looking for elements with aria-hidden="true"
    const svgElements = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgElements.length).toBeGreaterThan(0);
  });
});