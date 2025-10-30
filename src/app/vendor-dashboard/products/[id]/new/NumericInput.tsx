'use client';

import { useState, useRef, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  placeholder?: string;
  className?: string;
  allowDecimals?: boolean;
}

export default function NumericInput({
  value,
  onChange,
  min = 0,
  placeholder = '0',
  className = '',
  allowDecimals = true,
}: NumericInputProps) {
  const [internalValue, setInternalValue] = useState(
    allowDecimals ? value.toFixed(2) : value.toString()
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update internal value when external value changes (only if not focused)
  useEffect(() => {
    if (!isFocused) {
      const formattedValue = allowDecimals ? value.toFixed(2) : value.toString();
      setInternalValue(formattedValue);
    }
  }, [value, isFocused, allowDecimals]);

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easy replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Parse and validate the value
    let numValue = allowDecimals ? parseFloat(internalValue) : parseInt(internalValue);
    
    // Handle invalid input
    if (isNaN(numValue)) {
      numValue = min;
    }
    
    // Apply minimum constraint
    if (numValue < min) {
      numValue = min;
    }
    
    // Format with 2 decimal places if decimals are allowed
    const formattedValue = allowDecimals ? numValue.toFixed(2) : numValue.toString();
    
    // Update both internal and external value
    setInternalValue(formattedValue);
    onChange(numValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow empty string while typing
    if (newValue === '') {
      setInternalValue('');
      return;
    }
    
    // Allow minus sign at the start if min is negative
    if (newValue === '-' && min < 0) {
      setInternalValue('-');
      return;
    }
    
    // Validate input based on allowDecimals
    const regex = allowDecimals 
      ? /^-?\d*\.?\d*$/  // Allow integers and decimals
      : /^-?\d*$/;        // Allow only integers
    
    if (regex.test(newValue)) {
      setInternalValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Enter to blur (save)
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    
    // Allow Escape to cancel changes
    if (e.key === 'Escape') {
      const formattedValue = allowDecimals ? value.toFixed(2) : value.toString();
      setInternalValue(formattedValue);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

