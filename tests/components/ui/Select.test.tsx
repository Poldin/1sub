import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '@/components/ui/Select';

describe('Select Component', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('should render select with options', () => {
    render(<Select options={mockOptions} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Check options are rendered
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Select label="Choose option" options={mockOptions} />);
    
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('should handle selection changes', () => {
    const onChange = vi.fn();
    render(<Select options={mockOptions} onChange={onChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'option2' })
      })
    );
  });

  it('should display selected value', () => {
    render(<Select options={mockOptions} value="option2" />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('should render with error state', () => {
    render(<Select options={mockOptions} error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500');
  });

  it('should apply custom className', () => {
    render(<Select options={mockOptions} className="custom-select" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-select');
  });

  it('should render with disabled state', () => {
    render(<Select options={mockOptions} disabled />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should render with required attribute', () => {
    render(<Select options={mockOptions} required />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeRequired();
  });

  it('should render with placeholder', () => {
    render(<Select options={mockOptions} placeholder="Select an option" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('placeholder', 'Select an option');
  });

  it('should render with multiple selection', () => {
    render(<Select options={mockOptions} multiple />);
    
    const select = screen.getByRole('listbox');
    expect(select).toHaveAttribute('multiple');
  });

  it('should render chevron down icon', () => {
    render(<Select options={mockOptions} />);
    
    const chevronIcon = screen.getByRole('combobox').parentElement?.querySelector('svg');
    expect(chevronIcon).toBeInTheDocument();
  });

  it('should handle empty options array', () => {
    render(<Select options={[]} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.children).toHaveLength(0);
  });

  it('should pass through additional props', () => {
    render(<Select options={mockOptions} data-testid="custom-select" />);
    
    const select = screen.getByTestId('custom-select');
    expect(select).toBeInTheDocument();
  });
});