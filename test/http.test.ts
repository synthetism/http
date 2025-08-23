/**
 * HTTP Unit Tests - Clean Implementation
 * 
 * Tests the HTTP unit with proper error handling and status extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Http } from '../src/http.unit.js';

// Mock axios - include isAxiosError helper used by the unit
vi.mock('axios', () => {
  function isAxiosError<T = unknown, D = unknown>(payload: unknown): payload is import('axios').AxiosError<T, D> {
    return !!(payload && typeof payload === 'object' && 'isAxiosError' in (payload as Record<string, unknown>) && (payload as Record<string, unknown>).isAxiosError === true);
  }
  type AxiosMock = ((config: unknown) => Promise<unknown>) & { isAxiosError: typeof isAxiosError };
  const baseMock = vi.fn();
  const axiosMock = baseMock as unknown as AxiosMock;
  axiosMock.isAxiosError = isAxiosError;
  return {
    default: axiosMock,
    isAxiosError
  };
});

// Import after mocking
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('HTTP Unit', () => {
  let http: Http;

  beforeEach(() => {
    http = Http.create({
      baseUrl: 'https://api.example.com',
      timeout: 5000
    });
    vi.clearAllMocks();
  });

  describe('Unit Architecture', () => {
    it('should have proper DNA and identity', () => {
      expect(http.dna).toBeDefined();
      expect(http.dna.id).toBe('http');    
    });

    it('should implement teach/learn paradigm', () => {
      expect(typeof http.teach).toBe('function');
      expect(typeof http.learn).toBe('function');

      const contract = http.teach();
      expect(contract.unitId).toBe('http');
      expect(contract.capabilities).toBeDefined();
    });

    it('should provide help documentation', () => {
      expect(typeof http.help).toBe('function');
      expect(() => http.help()).not.toThrow();
    });
  });

  describe('HTTP Operations', () => {
    describe('GET Requests', () => {
      it('should execute successful GET request', async () => {
        mockedAxios.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: '{"users": [{"id": 1, "name": "Alice"}]}'
        });

        const result = await http.get('/users');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value.response.status).toBe(200);
        expect(result.value.parsed).toEqual({ users: [{ id: 1, name: 'Alice' }] });
      });

      it('should handle network errors', async () => {
        const networkError = Object.assign(new Error('getaddrinfo ENOTFOUND api.example.com'), {
          code: 'ENOTFOUND',
          isAxiosError: true
        });
        
        mockedAxios.mockRejectedValue(networkError);

        const result = await http.get('/users');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Network error ENOTFOUND');
      });
    });

    describe('POST Requests', () => {
      it('should execute successful POST request', async () => {
        mockedAxios.mockResolvedValue({
          status: 201,
          statusText: 'Created',
          headers: { 'content-type': 'application/json' },
          data: '{"id": 123, "name": "Bob"}'
        });

        const userData = { name: 'Bob', email: 'bob@example.com' };
        const result = await http.post('/users', userData);
        
        expect(result.isSuccess).toBe(true);
        expect(result.value.response.status).toBe(201);
        expect(result.value.parsed).toEqual({ id: 123, name: 'Bob' });
      });

      it('should handle POST with string data', async () => {
        mockedAxios.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'text/plain' },
          data: 'Success'
        });

        const result = await http.post('/webhook', 'raw data');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value.response.status).toBe(200);
        expect(result.value.response.body).toBe('Success');
      });
    });

    describe('PUT/DELETE Requests', () => {
      it('should execute PUT request', async () => {
        mockedAxios.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: '{"id": 123, "name": "Updated Bob"}'
        });

        const result = await http.put('/users/123', { name: 'Updated Bob' });
        
        expect(result.isSuccess).toBe(true);
        expect(result.value.response.status).toBe(200);
      });

      it('should execute DELETE request', async () => {
        mockedAxios.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: '{}'
        });

        const result = await http.delete('/users/123');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value.response.status).toBe(200);
      });
    });
  });

  describe('Error Handling & Status Validation', () => {
    it('should handle 4xx client errors with proper status', async () => {
      mockedAxios.mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: '{"error": "User not found"}'
      });

      const result = await http.get('/users/999');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTP 404');
      expect(result.error).toContain('Not Found');
    });

    it('should handle 5xx server errors with proper status', async () => {
      mockedAxios.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        data: '{"error": "Database connection failed"}'
      });

      const result = await http.get('/users');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTP 500');
      expect(result.error).toContain('Internal Server Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = Object.assign(new Error('timeout of 5000ms exceeded'), {
        code: 'ECONNABORTED',
        isAxiosError: true
      });
      
      mockedAxios.mockRejectedValue(timeoutError);

      const result = await http.get('/slow-endpoint');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Network error ECONNABORTED');
    });

    it('should handle custom status validation', async () => {
      const customHttp = Http.create({
        baseUrl: 'https://api.example.com',
        validateStatus: (status) => status < 400 // Accept redirects as success
      });

      mockedAxios.mockResolvedValue({
        status: 302,
        statusText: 'Found',
        headers: { location: '/new-path' },
        data: ''
      });

      const result = await customHttp.get('/redirect-me');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(302);
    });
  });

  describe('URL Building & Utilities', () => {
    it('should build URLs correctly', () => {
      const url = http.buildUrl('/users', { page: '1', limit: '10' });
      expect(url).toBe('https://api.example.com/users?page=1&limit=10');
    });

    it('should handle absolute URLs', () => {
      const url = http.buildUrl('https://other-api.com/data');
      expect(url).toBe('https://other-api.com/data');
    });

    it('should handle empty base URL', () => {
      const httpNoBase = Http.create();
      const url = httpNoBase.buildUrl('/users');
      expect(url).toBe('/users');
    });
  });

  describe('Proxy Support', () => {
    it('should pass proxy configuration to axios', async () => {
      const proxyConfig = {
        id: 'test-proxy',
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http' as const,
        username: 'user',
        password: 'pass'
      };

      mockedAxios.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: '{"ip": "1.2.3.4"}'
      });

      const result = await http.get('/ip', { proxy: proxyConfig });
      
      expect(result.isSuccess).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          proxy: {
            protocol: 'http',
            host: 'proxy.example.com',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass'
            }
          }
        })
      );
    });

    it('should handle proxy authentication errors', async () => {
      const proxyError = Object.assign(new Error('Proxy Authentication Required'), {
        isAxiosError: true,
        response: {
          status: 407,
          statusText: 'Proxy Authentication Required',
          headers: {
            'proxy-authenticate': 'Basic realm="proxy"'
          }
        }
      });
      
      mockedAxios.mockRejectedValue(proxyError);

      const result = await http.get('/data', {
        proxy: {
          id: 'test',
          host: 'proxy.com',
          port: 8080,
          protocol: 'http' as const
        }
      });
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('HTTP 407');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultHttp = Http.create();
      
      expect(defaultHttp.baseUrl).toBe('');
      expect(defaultHttp.toJSON()).toMatchObject({
        type: 'HttpUnit',
        timeout: 30000,
        retries: 0
      });
    });

    it('should use custom configuration', () => {
      const customHttp = Http.create({
        baseUrl: 'https://custom.api.com',
        timeout: 10000,
        retries: 3,
        defaultHeaders: { 'X-API-Key': 'secret' }
      });
      
      expect(customHttp.baseUrl).toBe('https://custom.api.com');
      expect(customHttp.toJSON()).toMatchObject({
        baseUrl: 'https://custom.api.com',
        timeout: 10000,
        retries: 3
      });
    });
  });

  describe('Capabilities & Teaching', () => {
    it('should expose native capabilities', () => {
      const capabilities = http.capabilities();
      
      expect(capabilities.has('request')).toBe(true);
      expect(capabilities.has('get')).toBe(true);
      expect(capabilities.has('post')).toBe(true);
      expect(capabilities.has('put')).toBe(true);
      expect(capabilities.has('delete')).toBe(true);
      expect(capabilities.has('buildUrl')).toBe(true);
      expect(capabilities.has('isOnline')).toBe(true);
    });

    it('should provide teaching contract', () => {
      const contract = http.teach();
      
      expect(contract.unitId).toBe('http');
      expect(contract.capabilities).toBeDefined();
      expect(contract.schema).toBeDefined();
      expect(contract.validator).toBeDefined();
    });

    it('should maintain namespace consistency', () => {
      const capabilities = http.capabilities();
      const capabilityList = capabilities.list();
      
      // All capabilities should be properly namespaced or native
      for (const cap of capabilityList) {
        expect(typeof cap).toBe('string');
        expect(cap.length).toBeGreaterThan(0);
      }
    });
  });
});
