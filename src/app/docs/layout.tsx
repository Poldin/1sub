import { getPageMap } from 'nextra/page-map'
import DocsLayoutWrapper from './DocsLayoutWrapper'

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageMap = await getPageMap('/docs')
  
  return (
    <DocsLayoutWrapper pageMap={pageMap}>
      {children}
    </DocsLayoutWrapper>
  )
}
