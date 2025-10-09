import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from '@/components/ui/Dialog';

describe('Dialog Component', () => {
  it('should render dialog when open', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument();
  });

  it('should close dialog when close button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
            <Dialog.CloseButton onClose={() => onOpenChange(false)} />
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close dialog when overlay is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const overlay = screen.getByTestId('dialog-overlay');
    fireEvent.click(overlay);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should not close dialog when content is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const content = screen.getByTestId('dialog-content');
    fireEvent.click(content);

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('should close dialog when Escape key is pressed', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should render dialog with footer', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
          <Dialog.Footer>
            <button>Cancel</button>
            <button>Confirm</button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should handle footer button clicks', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
          <Dialog.Footer>
            <button onClick={onCancel}>Cancel</button>
            <button onClick={onConfirm}>Confirm</button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should focus first focusable element when opened', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <input placeholder="First input" />
            <input placeholder="Second input" />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const firstInput = screen.getByPlaceholderText('First input');
    expect(firstInput).toHaveFocus();
  });

  it('should trap focus within dialog', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <input placeholder="First input" />
            <input placeholder="Second input" />
            <button>Action</button>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const firstInput = screen.getByPlaceholderText('First input');
    const secondInput = screen.getByPlaceholderText('Second input');
    const actionButton = screen.getByText('Action');

    // Focus should cycle through elements
    firstInput.focus();
    fireEvent.keyDown(firstInput, { key: 'Tab', shiftKey: true });
    expect(actionButton).toHaveFocus();

    actionButton.focus();
    fireEvent.keyDown(actionButton, { key: 'Tab' });
    expect(firstInput).toHaveFocus();
  });

  it('should render with custom className', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content className="custom-dialog">
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const content = screen.getByTestId('dialog-content');
    expect(content).toHaveClass('custom-dialog');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content size="sm">
          <Dialog.Header>
            <Dialog.Title>Small Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Small content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.getByTestId('dialog-content')).toHaveClass('max-w-sm');

    rerender(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>Large Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Large content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.getByTestId('dialog-content')).toHaveClass('max-w-lg');
  });

  it('should render with loading state', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content loading>
          <Dialog.Header>
            <Dialog.Title>Loading Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>Dialog content</p>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle form submission in dialog', () => {
    const onSubmit = vi.fn();
    
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Form Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <form onSubmit={onSubmit} role="form">
              <input name="field" defaultValue="test" />
              <button type="submit">Submit</button>
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should render with scrollable content', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Scrollable Dialog</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body scrollable>
            {Array.from({ length: 100 }, (_, i) => (
              <p key={i}>Line {i + 1}</p>
            ))}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );

    const body = screen.getByTestId('dialog-body');
    expect(body).toHaveClass('overflow-y-auto');
  });
});
