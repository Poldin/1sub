import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../../mdx-components'

// Filter out the 'docs' prefix since route is already /docs/[[...slug]]
const originalGenerateStaticParams = generateStaticParamsFor('slug')
export const generateStaticParams = async () => {
  const params = await originalGenerateStaticParams()
  return params.map((p: { slug?: string[] }) => ({
    slug: p.slug?.[0] === 'docs' ? p.slug.slice(1) : p.slug
  }))
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params
  const { metadata } = await importPage(['docs', ...(params.slug || [])])
  return metadata
}

const Wrapper = useMDXComponents({}).wrapper || (({ children }: { children: React.ReactNode }) => <>{children}</>)

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params
  const { default: MDXContent, toc, metadata } = await importPage(['docs', ...(params.slug || [])])
  
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
