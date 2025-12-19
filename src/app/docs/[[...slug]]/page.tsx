import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../../mdx-components'
import { readFile } from 'fs/promises'
import { join } from 'path'
import CopyMarkdownButton from '../../../components/docs/CopyMarkdownButton'

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
  
  // Read raw markdown content for LLM copy feature
  let rawMarkdown = ''
  let fileName = 'page'
  try {
    const slug = params.slug || []
    const basePath = slug.length === 0 ? 'index' : slug.join('/')
    fileName = slug.length === 0 ? 'index.mdx' : `${slug[slug.length - 1]}.mdx`
    
    // Try content/docs first, then docs as fallback
    let filePath = join(process.cwd(), 'content/docs', `${basePath}.mdx`)
    try {
      rawMarkdown = await readFile(filePath, 'utf-8')
    } catch {
      // Fallback to docs/ directory
      filePath = join(process.cwd(), 'docs', `${basePath}.mdx`)
      rawMarkdown = await readFile(filePath, 'utf-8')
    }
  } catch (error) {
    console.error('Failed to read markdown file:', error)
    rawMarkdown = '# Content not available\n\nFailed to load raw markdown content.'
  }
  
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <CopyMarkdownButton markdown={rawMarkdown} fileName={fileName} />
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
