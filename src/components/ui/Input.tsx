import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-[#ededed]">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg
          text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2
          focus:ring-[#3ecf8e] focus:border-transparent transition-colors
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
