'use client'

import { useState } from 'react'

interface CopyMarkdownButtonProps {
  markdown: string
  fileName: string
}

export default function CopyMarkdownButton({ markdown, fileName }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex justify-start mb-2 mt-2">
      <div className="relative">
        <button
          onClick={handleCopy}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="flex items-center gap-2 py-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 text-xs font-medium"
        >
          {copied ? (
            <>
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                />
              </svg>
              <span>Copy for LLM</span>
            </>
          )}
        </button>
        
        {/* Tooltip */}
        {showTooltip && !copied && (
          <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 border border-gray-700">
            <div className="font-semibold mb-1">Copy Markdown Source</div>
            <div className="text-gray-300 dark:text-gray-400">
              Copies the raw markdown content of <span className="font-mono text-blue-400">{fileName}</span> to clipboard for use with AI assistants
            </div>
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-l border-t border-gray-700"></div>
          </div>
        )}
      </div>
    </div>
  )
}

