'use client'

import dynamic from 'next/dynamic'
import type { PageMapItem } from 'nextra'

const DocsLayoutClient = dynamic(() => import('./DocsLayoutClient'), {
  ssr: false,
})

export default function DocsLayoutWrapper({
  children,
  pageMap,
}: {
  children: React.ReactNode
  pageMap: PageMapItem[]
}) {
  return (
    <DocsLayoutClient pageMap={pageMap}>
      {children}
    </DocsLayoutClient>
  )
}
