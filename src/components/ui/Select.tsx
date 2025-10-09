import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  className?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, className = '', options, ...props }: SelectProps) {
  const selectId = React.useId();
  
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[#ededed]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg
            text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]
            focus:border-transparent transition-colors appearance-none pr-8
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
