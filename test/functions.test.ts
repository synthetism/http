/**
 * HTTP Pure Functions Tests - Serverless Ready Operations
 * 
 * Tests all pure HTTP functions with edge cases
 * and concurrent execution validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  request,
  get,
  post,
  put,
  httpDelete,
  patch,
  buildUrl,
  parseJson,
  isSuccessStatus,
  isClientError,
  isServerError,
  isRedirect,
  getStatusCategory,
  createBasicAuth,
  createBearerAuth,
  createFormData,
  extractFilename,
  isAbsoluteUrl,
  retryRequest
} from '../src/functions.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HTTP Pure Functions - Core Operations', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Request Functions', () => {
    it('should execute request with all options', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"data": "test"}')
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await request({
        url: 'https://api.example.com/test',
        method: 'POST',
        headers: { 'Authorization': 'Bearer token' },
        body: { test: 'data' },
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.body).toBe('{"data": "test"}');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
            'Content-Type': 'application/json'
          }),
          body: '{"test":"data"}'
        })
      );
    });

    it('should handle string body without JSON conversion', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('OK')
      };
      mockFetch.mockResolvedValue(mockResponse);

      await request({
        url: 'https://api.example.com/webhook',
        method: 'POST',
        body: 'raw string data'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          body: 'raw string data'
        })
      );
    });

    it('should handle request timeout', async () => {
      // Mock a long-running request
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const response = await request({
        url: 'https://api.example.com/slow',
        method: 'GET',
        timeout: 100 // Very short timeout
      });

      // Should complete without throwing (timeout handled internally)
      expect(response).toBeDefined();
    });
  });

  describe('HTTP Method Functions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('success')
      });
    });

    it('should execute GET request', async () => {
      const response = await get('https://api.example.com/users');
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should execute POST request with data', async () => {
      const data = { name: 'Alice' };
      const response = await post('https://api.example.com/users', data);
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });

    it('should execute PUT request', async () => {
      const response = await put('https://api.example.com/users/1', { name: 'Updated' });
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should execute DELETE request', async () => {
      const response = await httpDelete('https://api.example.com/users/1');
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should execute PATCH request', async () => {
      const response = await patch('https://api.example.com/users/1', { name: 'Patched' });
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});

describe('HTTP Pure Functions - Utility Operations', () => {
  describe('URL Building', () => {
    it('should build URL without parameters', () => {
      expect(buildUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users');
      expect(buildUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
      expect(buildUrl('https://api.example.com', 'users')).toBe('https://api.example.com/users');
    });

    it('should build URL with query parameters', () => {
      const url = buildUrl('https://api.example.com', '/users', { page: '1', limit: '10' });
      expect(url).toBe('https://api.example.com/users?page=1&limit=10');
    });

    it('should handle absolute URLs', () => {
      const absoluteUrl = 'https://other.example.com/data';
      expect(buildUrl('https://api.example.com', absoluteUrl)).toBe(absoluteUrl);
      
      const urlWithParams = buildUrl('', absoluteUrl, { q: 'test' });
      expect(urlWithParams).toBe('https://other.example.com/data?q=test');
    });

    it('should handle empty base URL', () => {
      expect(buildUrl('', '/users')).toBe('/users');
      expect(buildUrl('', '/users', { q: 'test' })).toBe('/users?q=test');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON response', () => {
      const response = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"users": [{"id": 1, "name": "Alice"}]}',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const parsed = parseJson(response);
      expect(parsed).toEqual({
        users: [{ id: 1, name: 'Alice' }]
      });
    });

    it('should return null for non-JSON content type', () => {
      const response = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' },
        body: 'plain text',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const parsed = parseJson(response);
      expect(parsed).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const response = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json {',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const parsed = parseJson(response);
      expect(parsed).toBeNull();
    });
  });

  describe('Status Code Helpers', () => {
    it('should identify success status codes', () => {
      expect(isSuccessStatus(200)).toBe(true);
      expect(isSuccessStatus(201)).toBe(true);
      expect(isSuccessStatus(299)).toBe(true);
      expect(isSuccessStatus(300)).toBe(false);
      expect(isSuccessStatus(199)).toBe(false);
    });

    it('should identify client error status codes', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(499)).toBe(true);
      expect(isClientError(500)).toBe(false);
      expect(isClientError(399)).toBe(false);
    });

    it('should identify server error status codes', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(502)).toBe(true);
      expect(isServerError(599)).toBe(true);
      expect(isServerError(499)).toBe(false);
      expect(isServerError(600)).toBe(false);
    });

    it('should identify redirect status codes', () => {
      expect(isRedirect(300)).toBe(true);
      expect(isRedirect(301)).toBe(true);
      expect(isRedirect(399)).toBe(true);
      expect(isRedirect(400)).toBe(false);
      expect(isRedirect(299)).toBe(false);
    });

    it('should categorize status codes', () => {
      expect(getStatusCategory(200)).toBe('success');
      expect(getStatusCategory(301)).toBe('redirect');
      expect(getStatusCategory(404)).toBe('client-error');
      expect(getStatusCategory(500)).toBe('server-error');
      expect(getStatusCategory(100)).toBe('unknown');
    });
  });

  describe('Authentication Helpers', () => {
    it('should create basic auth header', () => {
      const auth = createBasicAuth('user', 'pass');
      expect(auth.Authorization).toBe('Basic dXNlcjpwYXNz'); // base64 of 'user:pass'
    });

    it('should create bearer auth header', () => {
      const auth = createBearerAuth('token123');
      expect(auth.Authorization).toBe('Bearer token123');
    });
  });

  describe('Form Data Helper', () => {
    it('should create FormData from object', () => {
      const data = {
        name: 'test',
        file: new Blob(['content'], { type: 'text/plain' })
      };
      
      const formData = createFormData(data);
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('name')).toBe('test');
      expect(formData.get('file')).toBeInstanceOf(Blob);
    });
  });

  describe('Filename Extraction', () => {
    it('should extract filename from Content-Disposition header', () => {
      const response = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: { 'content-disposition': 'attachment; filename="test.pdf"' },
        body: 'binary data',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const filename = extractFilename(response);
      expect(filename).toBe('test.pdf');
    });

    it('should return null when no Content-Disposition header', () => {
      const response = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'data',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const filename = extractFilename(response);
      expect(filename).toBeNull();
    });
  });

  describe('URL Utilities', () => {
    it('should identify absolute URLs', () => {
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
      expect(isAbsoluteUrl('http://example.com')).toBe(true);
      expect(isAbsoluteUrl('/relative/path')).toBe(false);
      expect(isAbsoluteUrl('relative/path')).toBe(false);
    });
  });
});

describe('HTTP Pure Functions - Advanced Operations', () => {
  describe('Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'success',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const requestFn = vi.fn().mockResolvedValue(mockResponse);
      const result = await retryRequest(requestFn, 3);

      expect(result).toBe(mockResponse);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockResponse = {
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'success',
        ok: true,
        timestamp: new Date(),
        duration: 100
      };

      const requestFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue(mockResponse);

      const result = await retryRequest(requestFn, 3);

      expect(result).toBe(mockResponse);
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const requestFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(retryRequest(requestFn, 2)).rejects.toThrow('Persistent error');
      expect(requestFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom base delay', async () => {
      const requestFn = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'));

      const startTime = Date.now();
      await expect(retryRequest(requestFn, 2, 50)).rejects.toThrow();
      const duration = Date.now() - startTime;

      // Should have waited at least 50ms + 100ms (exponential backoff)
      expect(duration).toBeGreaterThan(140);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Map(),
        text: () => Promise.resolve('')
      });

      const response = await get('https://api.example.com/empty');
      expect(response.body).toBe('');
      expect(response.status).toBe(204);
    });

    it('should handle large responses', async () => {
      const largeData = 'x'.repeat(1000000); // 1MB of data
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve(largeData)
      });

      const response = await get('https://api.example.com/large');
      expect(response.body).toBe(largeData);
    });

    it('should handle special characters in URLs and data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"success": true}')
      });

      const specialData = { message: 'Hello 世界! 🌍 Special chars: @#$%^&*()' };
      const response = await post('https://api.example.com/special', specialData);
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/special',
        expect.objectContaining({
          body: JSON.stringify(specialData)
        })
      );
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"data": "concurrent"}')
      });

      const requests = Array.from({ length: 10 }, (_, i) => 
        get(`https://api.example.com/item/${i}`)
      );

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should be stateless across calls', () => {
      const url1 = buildUrl('https://api.example.com', '/users');
      const url2 = buildUrl('https://api.example.com', '/products');
      
      expect(url1).toBe('https://api.example.com/users');
      expect(url2).toBe('https://api.example.com/products');
      
      // Second call should not be affected by first
      const url1Again = buildUrl('https://api.example.com', '/users');
      expect(url1Again).toBe('https://api.example.com/users');
    });

    it('should handle rapid sequential operations', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          text: () => Promise.resolve(`{"call": ${callCount}}`)
        });
      });

      // Rapid sequential calls
      const responses: Awaited<ReturnType<typeof get>>[] = [];
      for (let i = 0; i < 100; i++) {
        responses.push(await get(`https://api.example.com/rapid/${i}`));
      }

      expect(responses).toHaveLength(100);
      expect(callCount).toBe(100);
      
      // Each response should be unique
      const bodies = responses.map(r => r.body);
      const uniqueBodies = new Set(bodies);
      expect(uniqueBodies.size).toBe(100);
    });
  });
});
