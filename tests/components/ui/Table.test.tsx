import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

describe('Table Component', () => {
  it('should render basic table structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
            <TableCell>30</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>jane@example.com</TableCell>
            <TableCell>25</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    
    // Check data rows
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should handle row click events', () => {
    const onRowClick = vi.fn();
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow onClick={() => onRowClick({ name: 'John Doe' })}>
            <TableCell>John Doe</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);
    
    expect(onRowClick).toHaveBeenCalledWith({ name: 'John Doe' });
  });

  it('should apply custom className to table', () => {
    render(
      <Table className="custom-table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('custom-table');
  });

  it('should render table with proper accessibility', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2); // Header + data row
  });

  it('should render table components individually', () => {
    render(
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
    
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  it('should apply custom className to table components', () => {
    render(
      <Table>
        <TableHeader className="custom-header">
          <TableRow className="custom-row">
            <TableHead className="custom-head">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="custom-body">
          <TableRow className="custom-row">
            <TableCell className="custom-cell">John Doe</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const header = screen.getByText('Name').closest('thead');
    const row = screen.getByText('John Doe').closest('tr');
    const cell = screen.getByText('John Doe').closest('td');
    
    expect(header).toHaveClass('custom-header');
    expect(row).toHaveClass('custom-row');
    expect(cell).toHaveClass('custom-cell');
  });
});