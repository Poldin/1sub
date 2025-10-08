import React from 'react';

type Variant = 'primary' | 'secondary';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'px-3 py-1.5 rounded border transition-colors';
  const styles = variant === 'primary'
    ? 'bg-[#3ecf8e] text-white border-[#3ecf8e] hover:bg-[#2dd4bf]'
    : 'bg-[#1f2937] text-[#3ecf8e] border-[#374151] hover:bg-[#374151]';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}


