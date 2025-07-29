/**
 * HTTP Pure Functions - Serverless Ready Operations
 * 
 * Stateless HTTP operations that can be deployed in serverless environments
 * or used independently without the Unit Architecture.
 * 
 * @version 1.0.0
 * @author SYNET ALPHA
 */

import type { HttpMethod, HttpRequest, HttpResponse } from './http.unit.js';

/**
 * Execute HTTP request using fetch API
 */
export async function request(config: HttpRequest): Promise<HttpResponse> {
  const startTime = Date.now();
  
  const controller = new AbortController();
  const timeoutId = config.timeout ? setTimeout(() => controller.abort(), config.timeout) : undefined;
  
  try {
    const headers = { ...config.headers };
    let body: string | undefined;
    
    if (config.body !== undefined) {
      if (typeof config.body === 'string') {
        body = config.body;
      } else {
        body = JSON.stringify(config.body);
        headers['Content-Type'] = 'application/json';
      }
    }
    
    const response = await fetch(config.url, {
      method: config.method,
      headers,
      body,
      signal: config.signal || controller.signal
    });
    
    if (!response) {
      throw new Error('Request failed - no response received');
    }
    
    const responseBody = await response.text();
    const duration = Date.now() - startTime;
    
    return {
      url: config.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      ok: response.ok,
      timestamp: new Date(),
      duration
    };
  } catch (error) {
    // Handle timeout and other errors
    const duration = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url: config.url,
        status: 408,
        statusText: 'Request Timeout',
        headers: {},
        body: '',
        ok: false,
        timestamp: new Date(),
        duration
      };
    }
    
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Execute GET request
 */
export async function get(url: string, headers?: Record<string, string>, timeout?: number): Promise<HttpResponse> {
  return request({
    url,
    method: 'GET',
    headers,
    timeout
  });
}

/**
 * Execute POST request
 */
export async function post(url: string, data?: string | object, headers?: Record<string, string>, timeout?: number): Promise<HttpResponse> {
  return request({
    url,
    method: 'POST',
    body: data,
    headers,
    timeout
  });
}

/**
 * Execute PUT request
 */
export async function put(url: string, data?: string | object, headers?: Record<string, string>, timeout?: number): Promise<HttpResponse> {
  return request({
    url,
    method: 'PUT',
    body: data,
    headers,
    timeout
  });
}

/**
 * Execute DELETE request
 */
export async function httpDelete(url: string, headers?: Record<string, string>, timeout?: number): Promise<HttpResponse> {
  return request({
    url,
    method: 'DELETE',
    headers,
    timeout
  });
}

/**
 * Execute PATCH request
 */
export async function patch(url: string, data?: string | object, headers?: Record<string, string>, timeout?: number): Promise<HttpResponse> {
  return request({
    url,
    method: 'PATCH',
    body: data,
    headers,
    timeout
  });
}

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
  // Handle absolute URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      return `${path}?${searchParams.toString()}`;
    }
    return path;
  }
  
  // Handle empty base URL - preserve leading slash
  if (!baseUrl) {
    const fullUrl = path.startsWith('/') ? path : `/${path}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      return `${fullUrl}?${searchParams.toString()}`;
    }
    return fullUrl;
  }
  
  // Combine base URL and path
  const base = baseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  const fullUrl = `${base}/${cleanPath}`;
  
  // Add query parameters
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${fullUrl}?${searchParams.toString()}`;
  }
  
  return fullUrl;
}

/**
 * Parse JSON response body safely
 */
export function parseJson<T = unknown>(response: HttpResponse): T | null {
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  
  try {
    return JSON.parse(response.body) as T;
  } catch {
    return null;
  }
}

/**
 * Check if HTTP status indicates success
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if HTTP status indicates client error
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if HTTP status indicates server error
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Check if HTTP status indicates redirect
 */
export function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

/**
 * Get HTTP status category
 */
export function getStatusCategory(status: number): 'success' | 'redirect' | 'client-error' | 'server-error' | 'unknown' {
  if (isSuccessStatus(status)) return 'success';
  if (isRedirect(status)) return 'redirect';
  if (isClientError(status)) return 'client-error';
  if (isServerError(status)) return 'server-error';
  return 'unknown';
}

/**
 * Create basic auth header
 */
export function createBasicAuth(username: string, password: string): Record<string, string> {
  const credentials = btoa(`${username}:${password}`);
  return {
    'Authorization': `Basic ${credentials}`
  };
}

/**
 * Create bearer auth header
 */
export function createBearerAuth(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Create form data from object
 */
export function createFormData(data: Record<string, string | File | Blob>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  
  return formData;
}

/**
 * Extract filename from Content-Disposition header
 */
export function extractFilename(response: HttpResponse): string | null {
  const contentDisposition = response.headers['content-disposition'];
  if (!contentDisposition) {
    return null;
  }
  
  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match?.[1]) {
    return match[1].replace(/['"]/g, '');
  }
  
  return null;
}

/**
 * Check if URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Retry HTTP request with exponential backoff
 */
export async function retryRequest(
  requestFn: () => Promise<HttpResponse>,
  maxRetries = 3,
  baseDelay = 100
): Promise<HttpResponse> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = baseDelay * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('HTTP request failed after retries');
}
