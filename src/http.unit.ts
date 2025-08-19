/**
 * HTTP Unit - Conscious HTTP Client Operations
 * 
 * SYNET Unit Architecture v1.0.6 Implementation
 * 
 * Philosophy: One unit, one goal - reliable HTTP communication
 * 
 * Native Capabilities:
 * - request() - Core HTTP request with full control
 * - get() - GET requests with auto-JSON parsing
 * - post() - POST requests with body serialization
 * - put() - PUT requests for updates
 * - delete() - DELETE requests for removal
 * 
 * Cross-Platform: Fetch API (Browser/Node.js 18+)
 * 
 * @author SYNET ALPHA
 * @version 1.0.0
 * @follows Unit Architecture Doctrine v1.0.6
 */

import { 
  Unit, 
  type UnitProps, 
  createUnitSchema, 
  type TeachingContract,
  type UnitCore,
  Capabilities,
  Schema,
  Validator
} from '@synet/unit';

import { Result } from './result';

// Doctrine #13: TYPE HIERARCHY CONSISTENCY (Config → Props → State → Output)

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * External input configuration for static create()
 */
export interface HttpConfig {
  baseUrl?: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  retries?: number;
  validateStatus?: (status: number) => boolean;
}

/**
 * Internal state after validation (implements UnitProps)
 */
export interface HttpProps extends UnitProps {
  baseUrl: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
  retries: number;
  validateStatus: (status: number) => boolean;
  readonly created: Date;
}

/**
 * HTTP request configuration
 */
export interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Record<string, string>;
  readonly body?: string | object;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

/**
 * HTTP response result
 */
export interface HttpResponse {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly ok: boolean;
  readonly timestamp: Date;
  readonly duration: number;
}

/**
 * HTTP request operation result
 */
export interface RequestResult {
  readonly response: HttpResponse;
  readonly parsed?: unknown;
  readonly requestId: string;
  readonly timestamp: Date;
}

const VERSION = '1.0.1';
/**
 * HTTP Implementation
 * 
 * Doctrine #1: ZERO DEPENDENCY (only native fetch API)
 * Doctrine #17: VALUE OBJECT FOUNDATION (immutable with identity and capabilities)
 */
export class Http extends Unit<HttpProps> {
  
  // Doctrine #4: CREATE NOT CONSTRUCT (protected constructor)
  protected constructor(props: HttpProps) {
    super(props);
  }

  protected build(): UnitCore {
    const capabilities = Capabilities.create(this.dna.id, {
      // Native HTTP capabilities only - wrapped for unknown[] compatibility
      request: (...args: unknown[]) => this.request(args[0] as HttpRequest),
      get: (...args: unknown[]) => this.get(args[0] as string, args[1] as Partial<HttpRequest>),
      post: (...args: unknown[]) => this.post(args[0] as string, args[1] as string | object, args[2] as Partial<HttpRequest>),
      put: (...args: unknown[]) => this.put(args[0] as string, args[1] as string | object, args[2] as Partial<HttpRequest>),
      delete: (...args: unknown[]) => this.delete(args[0] as string, args[1] as Partial<HttpRequest>),
      
      // Utility capabilities
      buildUrl: (...args: unknown[]) => this.buildUrl(args[0] as string, args[1] as Record<string, string>),
      isOnline: (...args: unknown[]) => this.isOnline()
    });

    const schema = Schema.create(this.dna.id, {
      request: {
        name: 'request',
        description: 'Execute HTTP request with full configuration',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Request URL' },
            method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
            headers: { type: 'object', description: 'Request headers' },
            body: { type: 'string', description: 'Request body' },
            timeout: { type: 'number', description: 'Request timeout in ms' }
          },
          required: ['url']
        },
        response: {
          type: 'object',
          properties: {
            response: { type: 'object', description: 'HTTP response object' },
            parsed: { type: 'object', description: 'Parsed response data' },
            requestId: { type: 'string', description: 'Unique request identifier' },
            timestamp: { type: 'string', description: 'Request timestamp' }
          },
          required: ['response', 'requestId', 'timestamp']
        }
      },
      get: {
        name: 'get',
        description: 'Execute GET request with automatic JSON parsing',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Request URL' },
            options: { type: 'object', description: 'Additional request options' }
          },
          required: ['url']
        },
        response: {
          type: 'object',
          properties: {
            response: { type: 'object', description: 'HTTP response object' },
            parsed: { type: 'object', description: 'Parsed response data' },
            requestId: { type: 'string', description: 'Unique request identifier' },
            timestamp: { type: 'string', description: 'Request timestamp' }
          },
          required: ['response', 'requestId', 'timestamp']
        }
      },
      post: {
        name: 'post',
        description: 'Execute POST request with body serialization',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Request URL' },
            data: { type: 'object', description: 'Request body data' },
            options: { type: 'object', description: 'Additional request options' }
          },
          required: ['url']
        },
        response: {
          type: 'object',
          properties: {
            response: { type: 'object', description: 'HTTP response object' },
            parsed: { type: 'object', description: 'Parsed response data' },
            requestId: { type: 'string', description: 'Unique request identifier' },
            timestamp: { type: 'string', description: 'Request timestamp' }
          },
          required: ['response', 'requestId', 'timestamp']
        }
      },
      put: {
        name: 'put',
        description: 'Execute PUT request for updates',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Request URL' },
            data: { type: 'object', description: 'Request body data' },
            options: { type: 'object', description: 'Additional request options' }
          },
          required: ['url']
        },
        response: {
          type: 'object',
          properties: {
            response: { type: 'object', description: 'HTTP response object' },
            parsed: { type: 'object', description: 'Parsed response data' },
            requestId: { type: 'string', description: 'Unique request identifier' },
            timestamp: { type: 'string', description: 'Request timestamp' }
          },
          required: ['response', 'requestId', 'timestamp']
        }
      },
      delete: {
        name: 'delete',
        description: 'Execute DELETE request for removal',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Request URL' },
            options: { type: 'object', description: 'Additional request options' }
          },
          required: ['url']
        },
        response: {
          type: 'object',
          properties: {
            response: { type: 'object', description: 'HTTP response object' },
            parsed: { type: 'object', description: 'Parsed response data' },
            requestId: { type: 'string', description: 'Unique request identifier' },
            timestamp: { type: 'string', description: 'Request timestamp' }
          },
          required: ['response', 'requestId', 'timestamp']
        }
      },
      buildUrl: {
        name: 'buildUrl',
        description: 'Build complete URL with query parameters',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'URL path' },
            params: { type: 'object', description: 'Query parameters' }
          },
          required: ['path']
        },
        response: {
          type: 'string'
        }
      },
      isOnline: {
        name: 'isOnline',
        description: 'Check network connectivity',
        parameters: {
          type: 'object',
          properties: {}
        },
        response: {
          type: 'boolean'
        }
      }
    });

    const validator = Validator.create({
      unitId: this.dna.id,
      capabilities,
      schema,
      strictMode: false
    });

    return { capabilities, schema, validator };
  }

    // Consciousness Trinity Access
  capabilities(): Capabilities { return this._unit.capabilities; }
  schema(): Schema { return this._unit.schema; }
  validator(): Validator { return this._unit.validator; }


  static create(config: HttpConfig = {}): Http {
   
    const props: HttpProps = {
      // Doctrine #7: EVERY UNIT MUST HAVE DNA
      dna: createUnitSchema({ 
        id: 'http', 
        version: VERSION 
      }),
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 30000,
      defaultHeaders: config.defaultHeaders || { 'Content-Type': 'application/json' },
      retries: config.retries || 0,
      validateStatus: config.validateStatus || ((status: number) => status >= 200 && status < 300),
      created: new Date()
    };
    
    return new Http(props);
  }

  // Doctrine #11: ALWAYS HELP (living documentation)
  help(): void {
    console.log(`


Hi, I am HTTP Unit [${this.dna.id}] v${this.dna.version} - Network Communication Service

IDENTITY: ${this.whoami()}
BASE URL: ${this.props.baseUrl || 'none'}
TIMEOUT: ${this.props.timeout}ms
RETRIES: ${this.props.retries}
STATUS: IMMUTABLE (stateless operations)

NATIVE CAPABILITIES:
• request(config) - Core HTTP request with full control (Result for validation)
• get(url, options?) - GET requests with auto-JSON parsing (Result)
• post(url, data?, options?) - POST requests with body serialization (Result)
• put(url, data?, options?) - PUT requests for updates (Result)
• delete(url, options?) - DELETE requests for removal (Result)
• isOnline() - Check network connectivity (throws on error)
• buildUrl(path, params?) - Build complete URL with query params (throws on error)

SUPPORTED FEATURES:
• Cross-platform fetch API (Browser/Node.js 18+)
• Automatic JSON request/response handling
• Request timeout with AbortController
• Custom headers and authentication
• Base URL and path composition
• HTTP status validation
• Request/response timing

USAGE EXAMPLES:
  const http = Http.create({
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    defaultHeaders: { 'Authorization': 'Bearer token' }
  });
  
  // Simple GET request
  const users = await http.get('/users');
  if (users.isSuccess) {
    console.log(users.value.parsed); // Parsed JSON data
  }
  
  // POST with data
  const created = await http.post('/users', { name: 'Alice' });
  if (created.isSuccess) {
    console.log('Created:', created.value.response.status);
  }

LEARNING CAPABILITIES:
Other units can learn from me:
  unit.learn([http.teach()]);
  unit.execute('http.get', '/api/data');

I TEACH:
• request(config) - Core HTTP request capability
• get(url, options) - GET request capability
• post(url, data, options) - POST request capability
• put(url, data, options) - PUT request capability
• delete(url, options) - DELETE request capability

`);
  }

  // Doctrine #2: TEACH/LEARN PARADIGM (every unit must teach)
  // Doctrine #9: ALWAYS TEACH (explicit capability binding)
  // Doctrine #19: CAPABILITY LEAKAGE PREVENTION (teach only native capabilities)


  // Doctrine #14: ERROR BOUNDARY CLARITY (Result for complex operations)

  /**
   * Core HTTP request (Result - complex network operation)
   */
  async request(config: HttpRequest): Promise<Result<RequestResult>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Build complete URL
      const url = this.resolveUrl(config.url);
      
      // Prepare request configuration
      const requestConfig = this.buildRequestConfig(config);
      
      // Execute request with retry logic
      const response = await this.executeWithRetries(url, requestConfig);
      
      // Build response object
      const httpResponse = await this.buildHttpResponse(url, response, startTime);
      
      // Validate status
      if (!this.props.validateStatus(httpResponse.status)) {
        return Result.fail(
          `HTTP ${httpResponse.status}: ${httpResponse.statusText}`,
          new Error(`Request failed with status ${httpResponse.status}`)
        );
      }

      // Parse JSON if content-type indicates JSON
      const parsed = this.tryParseJson(httpResponse);

      const result: RequestResult = {
        response: httpResponse,
        parsed,
        requestId,
        timestamp: new Date()
      };

      return Result.success(result);
    } catch (error) {
      return Result.fail(
        `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * GET request (Result - convenience method)
   */
  async get(url: string, options: Partial<HttpRequest> = {}): Promise<Result<RequestResult>> {
    return this.request({
      url,
      method: 'GET',
      ...options
    });
  }

  /**
   * POST request (Result - convenience method)
   */
  async post(url: string, data?: string | object, options: Partial<HttpRequest> = {}): Promise<Result<RequestResult>> {
    return this.request({
      url,
      method: 'POST',
      body: data,
      ...options
    });
  }

  /**
   * PUT request (Result - convenience method)
   */
  async put(url: string, data?: string | object, options: Partial<HttpRequest> = {}): Promise<Result<RequestResult>> {
    return this.request({
      url,
      method: 'PUT',
      body: data,
      ...options
    });
  }

  /**
   * DELETE request (Result - convenience method)
   */
  async delete(url: string, options: Partial<HttpRequest> = {}): Promise<Result<RequestResult>> {
    return this.request({
      url,
      method: 'DELETE',
      ...options
    });
  }

  // Doctrine #14: ERROR BOUNDARY CLARITY (throws for simple operations)

  /**
   * Check network connectivity (throw on error - simple check operation)
   */
  async isOnline(): Promise<boolean> {
    try {
      // Simple connectivity check - try to reach a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      throw new Error(`Network connectivity check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build complete URL with query parameters (throw on error - simple URL operation)
   */
  buildUrl(path: string, params?: Record<string, string>): string {
    try {
      const url = this.resolveUrl(path);
      
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        return `${url}?${searchParams.toString()}`;
      }
      
      return url;
    } catch (error) {
      throw new Error(`URL building failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Doctrine #8: PURE FUNCTION HEARTS (core logic as pure functions)

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    if (!this.props.baseUrl) {
      return path;
    }
    
    const base = this.props.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  }

  private buildRequestConfig(config: HttpRequest): RequestInit {
    const headers = {
      ...this.props.defaultHeaders,
      ...config.headers
    };

    let body: string | undefined;
    if (config.body !== undefined) {
      if (typeof config.body === 'string') {
        body = config.body;
      } else {
        body = JSON.stringify(config.body);
        headers['Content-Type'] = 'application/json';
      }
    }

    return {
      method: config.method,
      headers,
      body,
      signal: config.signal
    };
  }

  private async executeWithRetries(url: string, requestConfig: RequestInit): Promise<Response> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.props.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.props.timeout);
        
        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.props.retries) {
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = 100 * 2 ** attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('HTTP request failed after retries');
  }

  private async buildHttpResponse(url: string, response: Response, startTime: number): Promise<HttpResponse> {
    const body = await response.text();
    const duration = Date.now() - startTime;
    
    return {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      ok: response.ok,
      timestamp: new Date(),
      duration
    };
  }

  private tryParseJson(response: HttpResponse): unknown | undefined {
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return undefined;
    }
    
    try {
      return JSON.parse(response.body);
    } catch {
      return undefined;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Standard unit identification
  whoami(): string {
    return `HttpUnit[${this.dna.id}@${this.dna.version}]`;
  }

  teach(): TeachingContract {
    return {
      unitId: this.props.dna.id,
      capabilities: this._unit.capabilities,
      schema: this._unit.schema,
      validator: this._unit.validator
    };
  }

  // JSON serialization (no sensitive data exposed)
  toJSON(): Record<string, unknown> {
    return {
      type: 'HttpUnit',
      dna: this.dna,
      baseUrl: this.props.baseUrl,
      timeout: this.props.timeout,
      retries: this.props.retries,
      learnedCapabilities: this.capabilities(), // This calls the base Unit class method
      created: this.props.created
    };
  }
}
