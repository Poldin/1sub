'use client'

import React, { useState } from 'react'

export const Expandable = ({ title, children }: { title?: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 border rounded-lg border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <span>{title || 'Details'}</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  )
}

export const Tabs = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = React.Children.toArray(children)
  
  return (
    <div className="my-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab, i) => {
          const tabElement = tab as React.ReactElement<{ title: string }>
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                activeTab === i 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tabElement.props?.title || `Tab ${i + 1}`}
            </button>
          )
        })}
      </div>
      <div className="pt-4">{tabs[activeTab]}</div>
    </div>
  )
}

export const Tab = ({ children }: { title?: string; children: React.ReactNode }) => (
  <div>{children}</div>
)

export const AccordionGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4 space-y-2">{children}</div>
)

export const Accordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <span>{title}</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  )
}
