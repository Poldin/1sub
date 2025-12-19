import { useMDXComponents as getDocsComponents } from 'nextra-theme-docs'
import React from 'react'
import Link from 'next/link'
import { 
  Expandable, 
  Tabs, 
  Tab, 
  AccordionGroup, 
  Accordion 
} from './src/components/docs/interactive'

// Callout components (static, no state)
const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex rounded-lg border py-2 pr-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
    <div className="select-none text-xl pl-3 pr-2">ℹ️</div>
    <div className="w-full min-w-0 leading-7">{children}</div>
  </div>
)

const Tip = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex rounded-lg border py-2 pr-4 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800">
    <div className="select-none text-xl pl-3 pr-2">💡</div>
    <div className="w-full min-w-0 leading-7">{children}</div>
  </div>
)

const Warning = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex rounded-lg border py-2 pr-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800">
    <div className="select-none text-xl pl-3 pr-2">⚠️</div>
    <div className="w-full min-w-0 leading-7">{children}</div>
  </div>
)

const Check = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 my-2">
    <span className="text-green-500">✓</span>
    <span>{children}</span>
  </div>
)

const Info = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex rounded-lg border py-2 pr-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
    <div className="select-none text-xl pl-3 pr-2">ℹ️</div>
    <div className="w-full min-w-0 leading-7">{children}</div>
  </div>
)

// API documentation components (static)
const ParamField = ({ body, header, type, required, children }: { 
  body?: string
  header?: string
  type?: string
  required?: boolean
  children: React.ReactNode 
}) => (
  <div className="my-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-2">
      <code className="font-bold text-sm">{body || header}</code>
      {type && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800">{type}</span>}
      {required && <span className="text-xs text-red-500 font-medium">required</span>}
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
  </div>
)

const ResponseField = ({ name, type, required, children }: { 
  name: string
  type?: string
  required?: boolean
  children: React.ReactNode 
}) => (
  <div className="my-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2">
      <code className="font-semibold text-sm">{name}</code>
      {type && <span className="text-xs text-gray-500">{type}</span>}
      {required && <span className="text-xs text-red-500">*</span>}
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
  </div>
)

const RequestExample = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4">
    <div className="text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">Request Example</div>
    {children}
  </div>
)

const ResponseExample = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4">
    <div className="text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">Response Example</div>
    {children}
  </div>
)

// Code components
const CodeGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4">{children}</div>
)

// Steps components
const Steps = ({ children }: { children: React.ReactNode }) => (
  <div className="my-6 ml-4 border-l-2 border-gray-200 pl-6 dark:border-gray-700">{children}</div>
)

const Step = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="relative my-6">
    <div className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-gray-700">•</div>
    {title && <h4 className="font-semibold mb-2">{title}</h4>}
    <div>{children}</div>
  </div>
)

// Card components
const CardGroup = ({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) => (
  <div className={`grid gap-4 my-6 grid-cols-1 md:grid-cols-${cols}`}>{children}</div>
)

const Card = ({ title, icon, href, children }: { title: string; icon?: string; href?: string; children?: React.ReactNode }) => {
  const titleContent = (
    <div className="flex items-center gap-2 font-semibold mb-2">
      {icon && <span className="text-lg">📄</span>}
      <span>{title}</span>
    </div>
  )
  
  const content = (
    <>
      {titleContent}
      {children && <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>}
    </>
  )
  
  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition dark:border-gray-700 dark:hover:border-gray-600">
      {href ? (
        <Link href={href} className="no-underline text-inherit hover:text-inherit block">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMDXComponents(components: any) {
  return {
    ...getDocsComponents(components),
    Note,
    Tip,
    Warning,
    Check,
    Info,
    ParamField,
    ResponseField,
    RequestExample,
    ResponseExample,
    Expandable,
    CodeGroup,
    Steps,
    Step,
    CardGroup,
    Card,
    Tabs,
    Tab,
    AccordionGroup,
    Accordion,
    ...components,
  }
}
