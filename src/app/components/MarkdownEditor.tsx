'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Componente per il preview markdown (riutilizzabile)
function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // Headings
        h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#ededed] mt-6 mb-4" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-[#ededed] mt-5 mb-3" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-xl font-bold text-[#ededed] mt-4 mb-2" {...props} />,
        h4: ({node, ...props}) => <h4 className="text-lg font-bold text-[#ededed] mt-3 mb-2" {...props} />,
        // Paragraphs
        p: ({node, ...props}) => <p className="text-[#d1d5db] text-base leading-loose mb-4" {...props} />,
        // Links
        a: ({node, ...props}) => <a className="text-[#3ecf8e] no-underline hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
        // Strong/Bold
        strong: ({node, ...props}) => <strong className="text-[#ededed] font-bold" {...props} />,
        // Emphasis/Italic
        em: ({node, ...props}) => <em className="text-[#d1d5db] italic" {...props} />,
        // Code inline
        code: ({node, inline, ...props}: any) => 
          inline ? (
            <code className="text-[#3ecf8e] bg-[#374151] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
          ) : (
            <code className="text-[#d1d5db] font-mono" {...props} />
          ),
        // Code blocks
        pre: ({node, ...props}) => (
          <pre className="bg-[#111111] border border-[#374151] rounded-lg p-4 overflow-x-auto mb-4" {...props} />
        ),
        // Lists
        ul: ({node, ...props}) => <ul className="list-disc list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
        li: ({node, ...props}) => <li className="text-[#d1d5db]" {...props} />,
        // Blockquotes
        blockquote: ({node, ...props}) => (
          <blockquote className="border-l-4 border-[#3ecf8e] pl-4 text-[#9ca3af] italic my-4" {...props} />
        ),
        // Horizontal rule
        hr: ({node, ...props}) => <hr className="border-[#374151] my-6" {...props} />,
        // Tables
        table: ({node, ...props}) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse" {...props} />
          </div>
        ),
        thead: ({node, ...props}) => <thead className="bg-[#1f2937]" {...props} />,
        tbody: ({node, ...props}) => <tbody {...props} />,
        tr: ({node, ...props}) => <tr className="border-b border-[#374151]" {...props} />,
        th: ({node, ...props}) => <th className="text-[#ededed] font-bold px-4 py-2 text-left border border-[#374151]" {...props} />,
        td: ({node, ...props}) => <td className="text-[#d1d5db] px-4 py-2 border border-[#374151]" {...props} />,
        // Images
        img: ({node, ...props}) => (
          <img className="rounded-lg border border-[#374151] max-w-full h-auto my-4" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Scrivi qui in markdown...',
  label = 'Description',
  rows = 10
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split');

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#d1d5db] mb-2">
          {label}
        </label>
      )}
      
      {/* Tabs */}
      <div className="flex gap-2 mb-2 border-b border-[#374151]">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'edit'
              ? 'text-[#3ecf8e] border-b-2 border-[#3ecf8e]'
              : 'text-[#9ca3af] hover:text-[#d1d5db]'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'text-[#3ecf8e] border-b-2 border-[#3ecf8e]'
              : 'text-[#9ca3af] hover:text-[#d1d5db]'
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('split')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'split'
              ? 'text-[#3ecf8e] border-b-2 border-[#3ecf8e]'
              : 'text-[#9ca3af] hover:text-[#d1d5db]'
          }`}
        >
          Split
        </button>
      </div>

      {/* Editor/Preview Container */}
      <div className="relative">
        {/* Edit Tab */}
        {activeTab === 'edit' && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y font-mono text-sm"
            placeholder={placeholder}
          />
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="w-full min-h-[200px] px-4 py-3 bg-[#1f2937] border border-[#4b5563] rounded-lg overflow-y-auto max-h-[600px]">
            {value ? (
              <div className="markdown-preview">
                <MarkdownPreview content={value} />
              </div>
            ) : (
              <p className="text-[#9ca3af] italic">Nessuna anteprima disponibile. Inizia a scrivere per vedere l'anteprima.</p>
            )}
          </div>
        )}

        {/* Split View */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1 mb-2">Editor</label>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y font-mono text-sm h-full min-h-[300px]"
                placeholder={placeholder}
              />
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1 mb-2">Preview</label>
              <div className="w-full min-h-[300px] px-4 py-3 bg-[#1f2937] border border-[#4b5563] rounded-lg overflow-y-auto max-h-[600px] h-full">
                {value ? (
                  <div className="markdown-preview">
                    <MarkdownPreview content={value} />
                  </div>
                ) : (
                  <p className="text-[#9ca3af] italic text-sm">Anteprima apparirà qui...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

