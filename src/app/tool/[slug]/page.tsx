import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ToolClientContent from './ClientContent';
import { Tool } from '@/lib/tool-types';

// Fetch tool data server-side
async function fetchToolData(slug: string): Promise<Tool | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/public/tools/${slug}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.tool || null;
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
}

// Generate metadata dynamically for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = await fetchToolData(slug);
  
  if (!tool) {
    return {
      title: 'Tool Not Found | 1Sub',
      description: 'The requested tool could not be found.',
    };
  }
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const toolUrl = `${siteUrl}/tool/${tool.slug}`;
  const imageUrl = tool.metadata?.ui?.hero_image_url || tool.url;
  const description = tool.description || `Discover ${tool.name} and manage your subscriptions with 1Sub`;
  const truncatedDescription = description.length > 160 ? description.slice(0, 157) + '...' : description;
  
  // Extract price info for structured data
  const lowestPrice = tool.products?.[0]?.pricing_model?.subscription?.price;
  
  // Extract tags for keywords
  const tags = tool.metadata?.ui?.tags || [];
  const keywords = [
    tool.name,
    ...tags,
    'subscription',
    'SaaS',
    '1Sub',
    'subscription management',
    'unified billing',
  ].join(', ');
  
  return {
    title: `${tool.name} - Pricing, Features & Reviews | 1Sub`,
    description: truncatedDescription,
    keywords,
    
    authors: tool.vendor_name ? [{ name: tool.vendor_name }] : undefined,
    
    // Open Graph
    openGraph: {
      title: tool.name,
      description: truncatedDescription,
      url: toolUrl,
      siteName: '1Sub',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${tool.name} - Product preview`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: tool.name,
      description: truncatedDescription,
      images: [imageUrl],
      creator: '@1sub_io',
    },
    
    // Canonical URL
    alternates: {
      canonical: toolUrl,
    },
    
    // Additional metadata
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// Generate static params for popular tools (ISR)
export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/public/tools`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const tools = data.tools || [];
    
    // Generate params for all tools (or limit to top N)
    return tools.slice(0, 100).map((tool: Tool) => ({
      slug: tool.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await fetchToolData(slug);
  
  if (!tool) {
    notFound();
  }
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Generate JSON-LD structured data for rich snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    ...(tool.metadata?.ui?.hero_image_url && {
      image: tool.metadata.ui.hero_image_url,
    }),
    ...(tool.avg_rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: tool.avg_rating,
        ratingCount: tool.active_users || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(tool.products && tool.products.length > 0 && {
      offers: tool.products
        .filter(p => p.pricing_model.subscription?.enabled || p.pricing_model.one_time?.enabled)
        .map(product => {
          const price = product.pricing_model.subscription?.price || 
                       (product.pricing_model.one_time?.type === 'absolute' 
                         ? product.pricing_model.one_time.price 
                         : product.pricing_model.one_time?.min_price);
          
          return {
            '@type': 'Offer',
            name: product.name,
            description: product.description,
            price: price,
            priceCurrency: 'EUR',
            ...(product.pricing_model.subscription?.enabled && {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: product.pricing_model.subscription.price,
                priceCurrency: 'EUR',
                unitText: product.pricing_model.subscription.interval === 'month' ? 'MONTH' : 'YEAR',
              },
            }),
          };
        }),
    }),
    ...(tool.vendor_name && {
      author: {
        '@type': 'Organization',
        name: tool.vendor_name,
      },
    }),
  };
  
  // Breadcrumb structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tools',
        item: `${siteUrl}/tools`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tool.name,
        item: `${siteUrl}/tool/${tool.slug}`,
      },
    ],
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      
      {/* Header */}
      <Header showPricing={false} showCta={false} />
      
      {/* Breadcrumbs for UX */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center space-x-2 text-sm text-[#9ca3af]">
          <li>
            <Link href="/" className="hover:text-[#3ecf8e] transition-colors">
              Home
            </Link>
          </li>
          <li>
            <span aria-hidden="true">/</span>
          </li>
          <li>
            <Link href="/#tools" className="hover:text-[#3ecf8e] transition-colors">
              Tools
            </Link>
          </li>
          <li>
            <span aria-hidden="true">/</span>
          </li>
          <li className="text-[#ededed] font-medium" aria-current="page">
            {tool.name}
          </li>
        </ol>
      </nav>
      
      {/* Client-side interactive content */}
      <ToolClientContent tool={tool} />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
