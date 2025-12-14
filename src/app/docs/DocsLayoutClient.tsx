'use client'

import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import type { PageMapItem } from 'nextra'

export default function DocsLayoutClient({
  children,
  pageMap,
}: {
  children: React.ReactNode
  pageMap: PageMapItem[]
}) {
  return (
    <Layout
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/1sub/docs"
      navbar={
        <Navbar
          logo={<span style={{ fontWeight: 600 }}>1Sub Docs</span>}
          chatLink="https://discord.gg/R87YSYpKK"
        />
      }
      footer={
        <Footer>
          {new Date().getFullYear()} © 1Sub. All rights reserved.
        </Footer>
      }
    >
      {children}
    </Layout>
  )
}
