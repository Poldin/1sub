import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  className?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    className = '', 
    helperText,
    icon,
    iconPosition = 'left',
    size = 'md',
    loading = false,
    clearable = false,
    onClear,
    required,
    ...props 
  }, ref) => {
    const inputId = React.useId();
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    const hasValue = props.value !== undefined && props.value !== '';
    const showClearButton = clearable && hasValue && onClear;
    
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#ededed]">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div 
          className={`relative ${icon && iconPosition === 'right' ? 'flex-row-reverse' : ''}`} 
          data-testid={icon || showClearButton ? 'input-container' : undefined}
        >
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-[#374151] border border-[#4b5563] rounded-lg
              text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2
              focus:ring-[#3ecf8e] focus:border-transparent transition-colors
              ${error ? 'border-red-500' : ''}
              ${icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${icon && iconPosition === 'right' ? 'pr-10' : ''}
              ${showClearButton ? 'pr-10' : ''}
              ${sizeClasses[size]}
              ${className}
            `}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]">
              {icon}
            </div>
          )}
          {showClearButton && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] hover:text-[#ededed] transition-colors"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div 
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3ecf8e]"
                data-testid="loading-spinner"
              />
            </div>
          )}
        </div>
        {helperText && !error && (
          <p className="text-sm text-[#9ca3af]">{helperText}</p>
        )}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-[#ededed]">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg
          text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2
          focus:ring-[#3ecf8e] focus:border-transparent transition-colors
          resize-vertical min-h-[100px]
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
