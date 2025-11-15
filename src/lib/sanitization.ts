/**
 * Input Sanitization Utility
 * 
 * Provides functions to sanitize user inputs and prevent XSS attacks.
 * Uses DOMPurify for HTML sanitization and validation for other inputs.
 */

/**
 * Sanitize HTML content to prevent XSS
 * Note: This is a server-side sanitization utility.
 * For client-side, import DOMPurify directly in the component.
 */
export function sanitizeHtml(dirty: string): string {
  // For server-side, we use a simple regex-based approach
  // DOMPurify requires a DOM environment (browser or jsdom)
  
  // Remove all HTML tags except safe ones
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const allowedTagsRegex = new RegExp(`<(?!\/?(${allowedTags.join('|')})\b)[^>]*>`, 'gi');
  
  let clean = dirty.replace(allowedTagsRegex, '');
  
  // Remove dangerous attributes
  clean = clean.replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
  clean = clean.replace(/javascript:/gi, ''); // Remove javascript: protocol
  clean = clean.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove script tags
  clean = clean.replace(/<iframe[^>]*>.*?<\/iframe>/gi, ''); // Remove iframes
  
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
  if (!trimmed.startsWith('http://') && 
      !trimmed.startsWith('https://') && 
      !trimmed.startsWith('/')) {
    return '';
  }
  
  return url;
}

/**
 * Sanitize markdown content (basic)
 * Removes potentially dangerous markdown patterns
 */
export function sanitizeMarkdown(markdown: string): string {
  let clean = markdown;
  
  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, '');
  
  // Remove javascript: links in markdown links
  clean = clean.replace(/\[([^\]]+)\]\(javascript:[^\)]*\)/gi, '[$1]()');
  
  // Remove data: links
  clean = clean.replace(/\[([^\]]+)\]\(data:[^\)]*\)/gi, '[$1]()');
  
  return clean;
}

/**
 * Sanitize object for safe logging
 * Removes sensitive fields and limits depth
 */
export function sanitizeForLogging(obj: unknown, depth: number = 3): unknown {
  if (depth <= 0) {
    return '[Max Depth Reached]';
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item, depth - 1));
  }
  
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'sessionToken',
    'refreshToken',
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Completely redact sensitive fields
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, depth - 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize user input for tool descriptions
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
 * Validate and sanitize product name
 */
export function sanitizeProductName(name: string): string {
  // Limit length
  if (name.length > 200) {
    name = name.substring(0, 200);
  }
  
  // Remove HTML tags
  let clean = name.replace(/<[^>]*>/g, '');
  
  // Remove special characters that could be used for injection
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

/**
 * Client-side HTML sanitization wrapper
 * To be used in browser environment with DOMPurify
 */
export function sanitizeHtmlClient(dirty: string): string {
  // This function should only be called in browser environment
  if (typeof window === 'undefined') {
    throw new Error('sanitizeHtmlClient can only be used in browser environment');
  }
  
  // Check if DOMPurify is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }
  
  // Fallback to server-side sanitization
  return sanitizeHtml(dirty);
}

