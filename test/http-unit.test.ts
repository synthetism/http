/**
 * HTTP Unit Tests - Unit Architecture Compliance & Core Operations
 * 
 * Tests both the conscious Unit and all HTTP operations
 * following Unit Architecture v1.0.6 patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Http } from '../src/http.unit.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HTTP Unit - Architecture Compliance', () => {
  let http: Http;

  beforeEach(() => {
    http = Http.create();
    mockFetch.mockClear();
  });

  describe('Unit Architecture Doctrines', () => {
    it('should follow Doctrine #7: EVERY UNIT MUST HAVE DNA', () => {
      expect(http.dna).toBeDefined();
      expect(http.dna.id).toBe('http');
   
    });

    it('should follow Doctrine #2: TEACH/LEARN PARADIGM', () => {
      expect(typeof http.teach).toBe('function');
      expect(typeof http.learn).toBe('function');
    });

    it('should follow Doctrine #11: ALWAYS HELP', () => {
      expect(typeof http.help).toBe('function');
      expect(() => http.help()).not.toThrow();
    });

    it('should follow Doctrine #9: ALWAYS TEACH', () => {
      const contract = http.teach();
      expect(contract).toBeDefined();
      expect(contract.unitId).toBe('http');
      expect(contract.capabilities).toBeDefined();
      
      // Should teach native capabilities using consciousness trinity
      expect(contract.capabilities.has('request')).toBe(true);
      expect(contract.capabilities.has('get')).toBe(true);
      expect(contract.capabilities.has('post')).toBe(true);
      expect(contract.capabilities.has('put')).toBe(true);
      expect(contract.capabilities.has('delete')).toBe(true);
    });

    it('should follow Doctrine #12: NAMESPACE EVERYTHING', () => {
      const contract = http.teach();
      expect(contract.unitId).toBe('http');
      
      // When learned by other units, capabilities will be namespaced as "http.get", etc.
    });

    it('should follow Doctrine #22: STATELESS OPERATIONS', () => {
      // Create new HTTP unit
      const http1 = Http.create();
      const http2 = Http.create();
      
      // Different instances should be independent
      expect(http1.dna.id).toBe(http2.dna.id); // Same unit type
      
      // Capabilities are consciousness trinity objects, not arrays
      const capabilities = http.capabilities();
      expect(capabilities).toBeInstanceOf(Object);
      expect(typeof capabilities.has).toBe('function');
      // Native capabilities are built-in, not learned capabilities
   
    });

     it('should provide proper whoami identification', () => {
      const identity = http.whoami();
      expect(identity).toContain('HttpUnit');
      expect(identity).toContain('http');
    });

  describe('Configuration & State Management', () => {
    it('should create with default configuration', () => {
      const defaultHttp = Http.create();
      const state = defaultHttp.toJSON();
      
      expect(state.baseUrl).toBe('');
      expect(state.timeout).toBe(30000);
      expect(state.retries).toBe(0);
    });

    it('should create with custom configuration', () => {
      const customHttp = Http.create({
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
        defaultHeaders: { 'Authorization': 'Bearer token' }
      });
      
      const state = customHttp.toJSON();
      expect(state.baseUrl).toBe('https://api.example.com');
      expect(state.timeout).toBe(5000);
      expect(state.retries).toBe(3);
    });

    it('should track stateless operation design', () => {
      const http = Http.create();
      
      // Setup mock
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"data": "test"}')
      });
      
      // Perform operations - should not change unit state
      http.get('/test1');
      http.post('/test2', { data: 'test' });
      
      // Unit should remain stateless - consciousness trinity shows built-in capabilities
      const capabilities = http.capabilities();
      expect(capabilities).toBeInstanceOf(Object);
      expect(typeof capabilities.has).toBe('function');
      // Has native capabilities but no learned ones initially
      expect(capabilities.has('get')).toBe(true); // Built-in capability
    });
  });
});

describe('HTTP Unit - Core HTTP Operations', () => {
  let http: Http;

  beforeEach(() => {
    http = Http.create({
      baseUrl: 'https://api.example.com',
      timeout: 5000
    });
    mockFetch.mockClear();
  });

  describe('GET Requests', () => {
    it('should execute GET request successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"users": [{"id": 1, "name": "Alice"}]}')
      });

      const result = await http.get('/users');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(200);
      expect(result.value.response.ok).toBe(true);
      expect(result.value.parsed).toEqual({
        users: [{ id: 1, name: 'Alice' }]
      });
    });

    it('should handle GET request with query parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('[]')
      });

      const url = http.buildUrl('/users', { page: '1', limit: '10' });
      expect(url).toBe('https://api.example.com/users?page=1&limit=10');
    });

    it('should handle GET request failures', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await http.get('/users');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Network error');
    });
  });

  describe('POST Requests', () => {
    it('should execute POST request with JSON data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"id": 123, "name": "Bob"}')
      });

      const userData = { name: 'Bob', email: 'bob@example.com' };
      const result = await http.post('/users', userData);
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(201);
      expect(result.value.parsed).toEqual({ id: 123, name: 'Bob' });
      
      // Verify request was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(userData)
        })
      );
    });

    it('should execute POST request with string data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('OK')
      });

      const result = await http.post('/webhook', 'raw data', {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      expect(result.isSuccess).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          body: 'raw data'
        })
      );
    });
  });

  describe('PUT/DELETE Requests', () => {
    it('should execute PUT request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"updated": true}')
      });

      const result = await http.put('/users/123', { name: 'Updated Name' });
      
      expect(result.isSuccess).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('should execute DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Map(),
        text: () => Promise.resolve('')
      });

      const result = await http.delete('/users/123');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(204);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Error Handling & Status Validation', () => {
    it('should handle 4xx client errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        text: () => Promise.resolve('{"error": "User not found"}')
      });

      const result = await http.get('/users/999');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle 5xx server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
        text: () => Promise.resolve('{"error": "Database connection failed"}')
      });

      const result = await http.get('/users');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTP 500');
    });

    it('should handle custom status validation', async () => {
      const httpWithCustomValidation = Http.create({
        baseUrl: 'https://api.example.com',
        validateStatus: (status) => status < 400 // Accept redirects as success
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map(),
        text: () => Promise.resolve('')
      });

      const result = await httpWithCustomValidation.get('/redirect');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(302);
    });
  });

  describe('Network Connectivity', () => {
    it('should check online status', async () => {
      // Mock successful connectivity check
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('')
      });

      const isOnline = await http.isOnline();
      expect(isOnline).toBe(true);
    });

    it('should detect offline status', async () => {
      // Mock network failure
      mockFetch.mockRejectedValue(new Error('Network unreachable'));

      await expect(http.isOnline()).rejects.toThrow('Network connectivity check failed');
    });
  });

  describe('URL Building', () => {
    it('should build URLs correctly', () => {
      const http = Http.create({ baseUrl: 'https://api.example.com' });
      
      expect(http.buildUrl('/users')).toBe('https://api.example.com/users');
      expect(http.buildUrl('users')).toBe('https://api.example.com/users');
      expect(http.buildUrl('/users', { page: '1' })).toBe('https://api.example.com/users?page=1');
    });

    it('should handle absolute URLs', () => {
      const http = Http.create({ baseUrl: 'https://api.example.com' });
      
      const absoluteUrl = 'https://other.example.com/data';
      expect(http.buildUrl(absoluteUrl)).toBe(absoluteUrl);
    });

    it('should handle empty base URL', () => {
      const http = Http.create();
      
      expect(http.buildUrl('/users')).toBe('/users');
      expect(http.buildUrl('/users', { q: 'test' })).toBe('/users?q=test');
    });
  });
});

describe('HTTP Unit - Teaching & Learning Integration', () => {
  let http: Http;

  beforeEach(() => {
    http = Http.create({ baseUrl: 'https://api.example.com' });
    mockFetch.mockClear();
  });

  it('should teach capabilities with proper signatures', async () => {
    const contract = http.teach();
    
    // Test that taught capabilities work using execute method
    expect(contract.capabilities.has('get')).toBe(true);
    expect(typeof contract.capabilities.execute).toBe('function');
  });

  it('should maintain consistent configuration access', async () => {
    const contract = http.teach();
    
    expect(contract.capabilities.has('buildUrl')).toBe(true);
    
    // Test capability execution
    const url = await contract.capabilities.execute('buildUrl', '/test', { param: 'value' });
    expect(url).toBe('https://api.example.com/test?param=value');
  });

  it('should support learning from other units', () => {
    const anotherHttp = Http.create({ baseUrl: 'https://other.example.com' });
    
    // Learn capabilities from another HTTP unit
    http.learn([anotherHttp.teach()]);
    
    // Should have learned capabilities now (they get namespaced)
    const capabilities = http.capabilities();
    expect(capabilities.list().length).toBeGreaterThan(0);
    expect(capabilities.list().some(cap => cap.includes('http.'))).toBe(true);
  });  
 });
});
