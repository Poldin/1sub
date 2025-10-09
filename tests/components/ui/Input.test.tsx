import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input Component', () => {
  it('should render input with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render input with label', () => {
    render(<Input label="Username" />);
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test value' })
    }));
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should show error styling when error is present', () => {
    render(<Input error="Error message" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should be readonly when readonly prop is true', () => {
    render(<Input readOnly />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('should render different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('should render with icon', () => {
    const Icon = () => <span data-testid="icon">📧</span>;
    render(<Input icon={<Icon />} />);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render with icon on the right', () => {
    const Icon = () => <span data-testid="icon">🔍</span>;
    render(<Input icon={<Icon />} iconPosition="right" />);
    
    const inputContainer = screen.getByTestId('input-container');
    expect(inputContainer).toHaveClass('flex-row-reverse');
  });

  it('should handle focus and blur events', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    
    render(<Input onFocus={onFocus} onBlur={onBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(onFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('should handle key events', () => {
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    
    render(<Input onKeyDown={onKeyDown} onKeyUp={onKeyUp} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    
    fireEvent.keyUp(input, { key: 'Enter' });
    expect(onKeyUp).toHaveBeenCalledTimes(1);
  });

  it('should render with custom className', () => {
    render(<Input className="custom-input" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-3 py-1.5 text-sm');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4 py-2 text-base');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-6 py-3 text-lg');
  });

  it('should render with helper text', () => {
    render(<Input helperText="This is helper text" />);
    
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('should render with required indicator', () => {
    render(<Input label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should forward ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    
    expect(ref).toHaveBeenCalled();
  });

  it('should handle controlled value', () => {
    const { rerender } = render(<Input value="initial" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial');
    
    rerender(<Input value="updated" />);
    expect(input).toHaveValue('updated');
  });

  it('should handle uncontrolled value with defaultValue', () => {
    render(<Input defaultValue="default" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('default');
  });

  it('should render with maxLength', () => {
    render(<Input maxLength={10} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  it('should render with min and max for number inputs', () => {
    render(<Input type="number" min={0} max={100} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('should render with step for number inputs', () => {
    render(<Input type="number" step={0.1} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('should render with pattern for validation', () => {
    render(<Input pattern="[0-9]+" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('pattern', '[0-9]+');
  });

  it('should render with autocomplete', () => {
    render(<Input autoComplete="email" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('should render with aria attributes', () => {
    render(
      <Input 
        aria-label="Custom label"
        aria-describedby="description"
        aria-invalid="true"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Custom label');
    expect(input).toHaveAttribute('aria-describedby', 'description');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should render with loading state', () => {
    render(<Input loading />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render with clear button', () => {
    const onClear = vi.fn();
    render(<Input value="test" clearable onClear={onClear} />);
    
    const clearButton = screen.getByLabelText('Clear input');
    fireEvent.click(clearButton);
    
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('should not show clear button when value is empty', () => {
    render(<Input value="" clearable />);
    
    expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
  });
});
