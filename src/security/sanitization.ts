/**
 * Input Sanitization
 *
 * CANONICAL SOURCE: All input sanitization MUST use this module.
 *
 * Provides functions to sanitize user inputs and prevent XSS/injection attacks.
 */

// ============================================================================
// HTML SANITIZATION
// ============================================================================

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Sanitize HTML content to prevent XSS (server-side)
 */
export function sanitizeHtml(dirty: string): string {
  const allowedTagsRegex = new RegExp(`<(?!\/?(${ALLOWED_TAGS.join('|')})\b)[^>]*>`, 'gi');

  let clean = dirty.replace(allowedTagsRegex, '');

  // Remove dangerous attributes
  clean = clean.replace(/on\w+="[^"]*"/gi, ''); // Event handlers
  clean = clean.replace(/javascript:/gi, ''); // javascript: protocol
  clean = clean.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Script tags
  clean = clean.replace(/<iframe[^>]*>.*?<\/iframe>/gi, ''); // Iframes

  return clean;
}

/**
 * Sanitize plain text by encoding HTML entities
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ============================================================================
// URL SANITIZATION
// ============================================================================

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }

  // Only allow http, https, and relative URLs
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return '';
  }

  return url;
}

// ============================================================================
// MARKDOWN SANITIZATION
// ============================================================================

/**
 * Sanitize markdown content
 */
export function sanitizeMarkdown(markdown: string): string {
  let clean = markdown;

  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // Remove javascript: links
  clean = clean.replace(/\[([^\]]+)\]\(javascript:[^\)]*\)/gi, '[$1]()');

  // Remove data: links
  clean = clean.replace(/\[([^\]]+)\]\(data:[^\)]*\)/gi, '[$1]()');

  return clean;
}

// ============================================================================
// DOMAIN-SPECIFIC SANITIZATION
// ============================================================================

/**
 * Sanitize tool description
 */
export function sanitizeToolDescription(description: string): string {
  // Limit length
  if (description.length > 5000) {
    description = description.substring(0, 5000);
  }

  // Remove HTML tags but preserve line breaks
  let clean = description.replace(/<[^>]*>/g, '');

  // Remove null bytes
  clean = clean.replace(/\0/g, '');

  // Trim excess whitespace
  clean = clean.trim();

  return clean;
}

/**
 * Sanitize product name
 */
export function sanitizeProductName(name: string): string {
  // Limit length
  if (name.length > 200) {
    name = name.substring(0, 200);
  }

  // Remove HTML tags
  let clean = name.replace(/<[^>]*>/g, '');

  // Remove special characters
  clean = clean.replace(/[<>\"\']/g, '');

  // Trim
  clean = clean.trim();

  return clean;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  // Remove whitespace and convert to lowercase
  let clean = email.trim().toLowerCase();

  // Remove any HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // Basic email format validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(clean)) {
    throw new Error('Invalid email format');
  }

  return clean;
}

// ============================================================================
// CLIENT-SIDE SANITIZATION
// ============================================================================

/**
 * Client-side HTML sanitization wrapper (requires DOMPurify in browser)
 */
export function sanitizeHtmlClient(dirty: string): string {
  if (typeof window === 'undefined') {
    throw new Error('sanitizeHtmlClient can only be used in browser environment');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }

  // Fallback to server-side sanitization
  return sanitizeHtml(dirty);
}
