import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/*',
          '/dashboard/*',
          '/admin/*',
          '/credit_checkout/*',
          '/register',
          '/login',
          '/_next/*',
          '/static/*',
        ],
      },
      // Special rules for good bots
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Googlebot-News'],
        allow: '/',
        disallow: [
          '/api/*',
          '/dashboard/*',
          '/admin/*',
        ],
        crawlDelay: 0,
      },
      // Block bad bots
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'cohere-ai',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
