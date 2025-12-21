import type { HttpMethod, HttpResponse, OneSubConfig } from '../types.js';
import { NetworkError, TimeoutError, parseApiError } from './errors.js';

/**
 * HTTP client for 1Sub API with retry logic and error handling
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;

  constructor(config: OneSubConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://1sub.io/api/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.debug = config.debug || false;
  }

  /**
   * Make an HTTP request with automatic retries
   */
  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest<T>(method, url, body);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except rate limits
        if (error instanceof Error && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            throw error;
          }
        }

        // Exponential backoff for retries
        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          this.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new NetworkError('Request failed after retries');
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    method: HttpMethod,
    url: string,
    body?: unknown
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      this.log(`${method} ${url}`);

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@1sub/sdk/1.0.0',
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      // Parse response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      // Parse response body
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json() as T;
      } else {
        data = await response.text() as T;
      }

      // Handle error responses
      if (!response.ok) {
        parseApiError(response.status, data);
      }

      this.log(`Response: ${response.status}`);

      return {
        data,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(this.timeout);
        }
        if (error.message.includes('fetch')) {
          throw new NetworkError(error.message);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    // Base delay of 1 second with exponential increase and jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message if debug mode is enabled
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[1Sub SDK] ${message}`);
    }
  }

  /**
   * GET request helper
   */
  async get<T>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request helper
   */
  async post<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  /**
   * PUT request helper
   */
  async put<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * DELETE request helper
   */
  async delete<T>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}
