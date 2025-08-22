# @synet/http - Advanced Usage Manual

Comprehensive guide for advanced HTTP patterns, authentication strategies, and production deployment scenarios.

## Table of Contents

- [Advanced Authentication](#advanced-authentication)
- [Proxy Configuration](#proxy-configuration)
- [Production Patterns](#production-patterns)
- [Error Handling Strategies](#error-handling-strategies)
- [Performance Optimization](#performance-optimization)
- [Unit Architecture Composition](#unit-architecture-composition)
- [Serverless Deployment](#serverless-deployment)
- [Testing Strategies](#testing-strategies)
- [Migration Patterns](#migration-patterns)

## Advanced Authentication

### OAuth 2.0 Flow

```typescript
import { Http, createBearerAuth } from '@synet/http';

class OAuthClient {
  private http: Http;
  private token?: string;
  private refreshToken?: string;

  constructor(clientId: string, clientSecret: string) {
    this.http = Http.create({
      baseUrl: 'https://oauth-provider.com'
    });
  }

  async authenticate(username: string, password: string) {
    const result = await this.http.post('/oauth/token', {
      grant_type: 'password',
      username,
      password,
      client_id: this.clientId
    });

    if (result.isSuccess()) {
      const data = parseJson(result.getValue());
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;
      
      // Create new HTTP client with token
      this.http = Http.create({
        baseUrl: 'https://api.example.com',
        headers: createBearerAuth(this.token)
      });
    }

    return result;
  }

  async refreshAccessToken() {
    const result = await this.http.post('/oauth/refresh', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    });

    if (result.isSuccess()) {
      const data = parseJson(result.getValue());
      this.token = data.access_token;
      
      // Update headers with new token
      this.http = Http.create({
        baseUrl: this.http.props.baseUrl,
        headers: { 
          ...this.http.props.headers,
          ...createBearerAuth(this.token)
        }
      });
    }

    return result;
  }
}
```

### JWT Token Management

```typescript
import { Http, createBearerAuth, isClientError } from '@synet/http';

class JWTHttpClient {
  private http: Http;
  private tokenExpiry?: Date;

  constructor(private baseUrl: string, private getToken: () => Promise<string>) {
    this.http = Http.create({ baseUrl });
  }

  private async ensureValidToken() {
    if (!this.tokenExpiry || this.tokenExpiry <= new Date()) {
      const token = await this.getToken();
      this.tokenExpiry = this.parseTokenExpiry(token);
      
      this.http = Http.create({
        baseUrl: this.baseUrl,
        headers: createBearerAuth(token)
      });
    }
  }

  private parseTokenExpiry(token: string): Date {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  }

  async request(method: string, path: string, data?: any) {
    await this.ensureValidToken();
    
    let result = await this.http.request({ 
      url: path, 
      method: method as any, 
      body: data 
    });

    // Auto-retry with token refresh on 401
    if (result.isFailure() || isClientError(result.getValue().status)) {
      await this.ensureValidToken();
      result = await this.http.request({ 
        url: path, 
        method: method as any, 
        body: data 
      });
    }

    return result;
  }
}
```

### API Key Rotation

```typescript
class RotatingAPIKeyClient {
  private currentKeyIndex = 0;
  private keys: string[];
  private http: Http;

  constructor(apiKeys: string[], baseUrl: string) {
    this.keys = apiKeys;
    this.http = this.createHttpWithCurrentKey();
  }

  private createHttpWithCurrentKey() {
    return Http.create({
      baseUrl: this.baseUrl,
      headers: { 'X-API-Key': this.keys[this.currentKeyIndex] }
    });
  }

  private rotateKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    this.http = this.createHttpWithCurrentKey();
  }

  async requestWithFallback(method: string, path: string, data?: any) {
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const result = await this.http.request({
        url: path,
        method: method as any,
        body: data
      });

      if (result.isSuccess()) {
        return result;
      }

      // If rate limited or unauthorized, try next key
      const response = result.getValue();
      if (response.status === 429 || response.status === 401) {
        this.rotateKey();
        continue;
      }

      // For other errors, return immediately
      return result;
    }

    throw new Error('All API keys exhausted');
  }
}
```

## Proxy Configuration

### Overview

The @synet/http unit provides comprehensive proxy support through undici integration for Node.js environments. This enables routing HTTP requests through proxy servers for anonymity, geo-location, load balancing, and security purposes.

### Basic Proxy Setup

```typescript
import { Http, type ProxyConnection } from '@synet/http';

// Define proxy connection
const proxy: ProxyConnection = {
  id: 'datacenter-proxy-1',
  host: 'proxy.datacenter.com',
  port: 8080,
  username: 'proxy_user',
  password: 'proxy_pass',
  protocol: 'http',
  country: 'us'
};

// Create HTTP unit
const http = Http.create({
  baseUrl: 'https://api.target.com',
  timeout: 30000
});

// Make request through proxy
const result = await http.request({
  url: '/sensitive-endpoint',
  method: 'GET',
  proxy
});
```

### Proxy Pool Management

```typescript
import { Http, type ProxyConnection } from '@synet/http';

class ProxyRotator {
  private proxies: ProxyConnection[];
  private currentIndex = 0;

  constructor(proxies: ProxyConnection[]) {
    this.proxies = proxies;
  }

  getNextProxy(): ProxyConnection {
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  async makeRequest(http: Http, url: string, data?: any) {
    let lastError: Error | null = null;
    
    // Try each proxy once
    for (let i = 0; i < this.proxies.length; i++) {
      const proxy = this.getNextProxy();
      
      try {
        const result = await http.request({
          url,
          method: data ? 'POST' : 'GET',
          body: data,
          proxy,
          timeout: 15000
        });
        
        if (result.isSuccess()) {
          return result;
        }
        
        lastError = new Error(result.getError());
      } catch (error) {
        lastError = error as Error;
        console.warn(`Proxy ${proxy.id} failed:`, error.message);
      }
    }
    
    throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
  }
}

// Usage
const proxyRotator = new ProxyRotator([
  { id: 'proxy-1', host: 'proxy1.com', port: 8080, protocol: 'http' },
  { id: 'proxy-2', host: 'proxy2.com', port: 1080, protocol: 'socks5' },
  { id: 'proxy-3', host: 'proxy3.com', port: 3128, protocol: 'http' }
]);

const http = Http.create({ baseUrl: 'https://api.example.com' });
const result = await proxyRotator.makeRequest(http, '/data');
```

### Geo-Location Proxy Routing

```typescript
interface GeoProxy extends ProxyConnection {
  country: string;
  region?: string;
  city?: string;
  speed: 'fast' | 'medium' | 'slow';
}

class GeoProxyManager {
  private proxiesByCountry: Map<string, GeoProxy[]> = new Map();

  constructor(proxies: GeoProxy[]) {
    for (const proxy of proxies) {
      const countryProxies = this.proxiesByCountry.get(proxy.country) || [];
      countryProxies.push(proxy);
      this.proxiesByCountry.set(proxy.country, countryProxies);
    }
  }

  getProxyForCountry(country: string, speed: 'fast' | 'medium' | 'slow' = 'fast'): GeoProxy | null {
    const countryProxies = this.proxiesByCountry.get(country.toLowerCase());
    if (!countryProxies) return null;

    // Filter by speed preference
    const filtered = countryProxies.filter(p => p.speed === speed);
    if (filtered.length === 0) return countryProxies[0]; // Fallback

    // Return random proxy from filtered list
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  async requestFromCountry(http: Http, url: string, country: string) {
    const proxy = this.getProxyForCountry(country);
    if (!proxy) {
      throw new Error(`No proxy available for country: ${country}`);
    }

    return http.request({
      url,
      method: 'GET',
      proxy
    });
  }
}

// Usage
const geoManager = new GeoProxyManager([
  { id: 'us-east-1', host: 'us-proxy.com', port: 8080, protocol: 'http', country: 'us', region: 'east', speed: 'fast' },
  { id: 'eu-west-1', host: 'eu-proxy.com', port: 8080, protocol: 'http', country: 'de', region: 'west', speed: 'fast' },
  { id: 'asia-1', host: 'asia-proxy.com', port: 8080, protocol: 'http', country: 'sg', speed: 'medium' }
]);

const http = Http.create({ baseUrl: 'https://geo-restricted-api.com' });
const result = await geoManager.requestFromCountry(http, '/us-only-endpoint', 'us');
```

### SOCKS5 Proxy Configuration

```typescript
// SOCKS5 proxy with authentication
const socksProxy: ProxyConnection = {
  id: 'socks5-tunnel',
  host: 'socks5.example.com',
  port: 1080,
  username: 'socks_user',
  password: 'socks_pass',
  protocol: 'socks5',
  country: 'nl'
};

// Usage with SOCKS5
const http = Http.create({
  baseUrl: 'https://api.example.com'
});

const result = await http.request({
  url: '/secure-data',
  method: 'GET',
  proxy: socksProxy,
  headers: {
    'User-Agent': 'MyApp/1.0'
  }
});
```

### Proxy Health Monitoring

```typescript
class ProxyHealthMonitor {
  private healthyProxies: Set<string> = new Set();
  private failedProxies: Map<string, number> = new Map();
  private readonly maxFailures = 3;

  async checkProxyHealth(proxy: ProxyConnection): Promise<boolean> {
    const http = Http.create({
      baseUrl: 'https://httpbin.org' // Public testing service
    });

    try {
      const result = await http.request({
        url: '/ip',
        method: 'GET',
        proxy,
        timeout: 10000
      });

      if (result.isSuccess()) {
        this.markHealthy(proxy.id);
        return true;
      } else {
        this.markFailed(proxy.id);
        return false;
      }
    } catch (error) {
      this.markFailed(proxy.id);
      return false;
    }
  }

  private markHealthy(proxyId: string): void {
    this.healthyProxies.add(proxyId);
    this.failedProxies.delete(proxyId);
  }

  private markFailed(proxyId: string): void {
    this.healthyProxies.delete(proxyId);
    const failures = (this.failedProxies.get(proxyId) || 0) + 1;
    this.failedProxies.set(proxyId, failures);
  }

  isProxyHealthy(proxyId: string): boolean {
    const failures = this.failedProxies.get(proxyId) || 0;
    return failures < this.maxFailures;
  }

  getHealthyProxies(proxies: ProxyConnection[]): ProxyConnection[] {
    return proxies.filter(proxy => this.isProxyHealthy(proxy.id));
  }

  async runHealthCheck(proxies: ProxyConnection[]): Promise<void> {
    const checks = proxies.map(proxy => this.checkProxyHealth(proxy));
    await Promise.allSettled(checks);
  }
}

// Usage
const monitor = new ProxyHealthMonitor();
const proxies: ProxyConnection[] = [
  { id: 'proxy-1', host: 'proxy1.com', port: 8080, protocol: 'http' },
  { id: 'proxy-2', host: 'proxy2.com', port: 8080, protocol: 'http' }
];

// Check health before using
await monitor.runHealthCheck(proxies);
const healthyProxies = monitor.getHealthyProxies(proxies);
```

### Error Handling and Fallbacks

```typescript
class RobustProxyClient {
  constructor(
    private http: Http,
    private proxies: ProxyConnection[],
    private monitor: ProxyHealthMonitor
  ) {}

  async makeRobustRequest(url: string, options: any = {}) {
    const healthyProxies = this.monitor.getHealthyProxies(this.proxies);
    
    if (healthyProxies.length === 0) {
      // Fallback to direct connection
      console.warn('No healthy proxies available, using direct connection');
      return this.http.request({
        url,
        method: 'GET',
        ...options
      });
    }

    // Try proxies in order of preference
    for (const proxy of healthyProxies) {
      try {
        const result = await this.http.request({
          url,
          method: 'GET',
          proxy,
          timeout: 15000,
          ...options
        });

        if (result.isSuccess()) {
          return result;
        }

        // Mark proxy as potentially unhealthy on failure
        this.monitor.markFailed(proxy.id);
        
      } catch (error) {
        console.warn(`Proxy ${proxy.id} failed:`, error.message);
        this.monitor.markFailed(proxy.id);
      }
    }

    // All proxies failed, try direct connection as last resort
    console.warn('All proxies failed, attempting direct connection');
    return this.http.request({
      url,
      method: 'GET',
      ...options
    });
  }
}
```

### Integration with @synet/proxy Unit

```typescript
import { Http } from '@synet/http';
import { ProxyUnit } from '@synet/proxy';

// Create proxy unit with automatic pool management
const proxyUnit = ProxyUnit.create({
  sources: [
    {
      type: 'datacenter',
      endpoint: 'https://proxy-provider.com/api/proxies',
      apiKey: 'your-api-key'
    }
  ],
  rotation: {
    strategy: 'round-robin',
    interval: 60000 // 1 minute
  },
  health: {
    checkInterval: 30000, // 30 seconds
    maxFailures: 3
  }
});

await proxyUnit.init();

// Use with HTTP unit
const http = Http.create({
  baseUrl: 'https://api.target.com'
});

// Get proxy from managed pool
const proxy = await proxyUnit.getProxy();

const result = await http.request({
  url: '/data',
  method: 'GET',
  proxy
});

// Release proxy back to pool
await proxyUnit.releaseProxy(proxy.id);
```

### Platform-Specific Behavior

```typescript
// Node.js - Full proxy support via undici
if (typeof window === 'undefined') {
  // Proxy support available
  const result = await http.request({
    url: '/api/data',
    proxy: myProxy // Will use undici ProxyAgent
  });
}

// Browser - Proxy handled by browser/OS
if (typeof window !== 'undefined') {
  // Proxy configuration ignored, uses browser proxy settings
  const result = await http.request({
    url: '/api/data',
    proxy: myProxy // Ignored in browser
  });
}

// Cloudflare Workers - Limited proxy support
// Check environment and adjust accordingly
const isCloudflareWorker = typeof caches !== 'undefined';
if (isCloudflareWorker) {
  // Use Cloudflare's proxy capabilities if needed
}
```

## Production Patterns

### Circuit Breaker Implementation

```typescript
import { Http, isServerError } from '@synet/http';

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

class CircuitBreakerHttp {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private http: Http,
    private failureThreshold = 5,
    private recoveryTimeout = 60000,
    private successThreshold = 3
  ) {}

  async request(config: any) {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await this.http.request(config);
      
      if (result.isFailure() || isServerError(result.getValue().status)) {
        this.onFailure();
        return result;
      }

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

### Rate Limiting with Token Bucket

```typescript
class RateLimitedHttp {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private http: Http,
    private capacity: number = 10,
    private refillRate: number = 1, // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async request(config: any) {
    this.refillTokens();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refillTokens();
    }

    this.tokens -= 1;
    return this.http.request(config);
  }
}
```

### Request Deduplication

```typescript
class DeduplicatedHttp {
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(private http: Http) {}

  private getRequestKey(config: any): string {
    return JSON.stringify({
      url: config.url,
      method: config.method,
      body: config.body,
      headers: config.headers
    });
  }

  async request(config: any) {
    const key = this.getRequestKey(config);
    
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = this.http.request(config);
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

## Error Handling Strategies

### Comprehensive Error Recovery

```typescript
import { Http, Result, retryRequest, isServerError, isClientError } from '@synet/http';

class ResilientHttpClient {
  constructor(private http: Http) {}

  async requestWithRecovery(config: any): Promise<Result<any, Error>> {
    return retryRequest(
      async () => {
        const result = await this.http.request(config);
        
        if (result.isFailure()) {
          throw new Error(result.getError().message);
        }

        const response = result.getValue();
        
        // Handle different error types
        if (isClientError(response.status)) {
          if (response.status === 401) {
            throw new AuthenticationError('Authentication required');
          } else if (response.status === 403) {
            throw new AuthorizationError('Access denied');
          } else if (response.status === 429) {
            throw new RateLimitError('Rate limit exceeded');
          } else {
            throw new ClientError(`Client error: ${response.status}`);
          }
        }

        if (isServerError(response.status)) {
          throw new ServerError(`Server error: ${response.status}`);
        }

        return response;
      },
      3, // max retries
      1000, // base delay
      (error) => {
        // Only retry on server errors or network issues
        return error instanceof ServerError || 
               error.message.includes('network') ||
               error.message.includes('timeout');
      }
    );
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientError';
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}
```

### Detailed Error Context

```typescript
class ContextualErrorHttp {
  constructor(private http: Http) {}

  async requestWithContext(config: any, context: Record<string, any> = {}) {
    try {
      const result = await this.http.request(config);
      
      if (result.isFailure()) {
        const error = result.getError();
        error.context = {
          ...context,
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
        throw error;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        error.context = {
          ...context,
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        };
      }
      throw error;
    }
  }
}
```

## Performance Optimization

### Request Batching

```typescript
class BatchedHttp {
  private batchQueue: Array<{
    config: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    private http: Http,
    private batchSize = 10,
    private batchDelay = 100
  ) {}

  async request(config: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ config, resolve, reject });

      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.batchQueue.splice(0, this.batchSize);
    
    try {
      const results = await Promise.allSettled(
        batch.map(item => this.http.request(item.config))
      );

      results.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled') {
          item.resolve(result.value);
        } else {
          item.reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }
}
```

### Response Caching

```typescript
interface CacheEntry {
  response: any;
  timestamp: number;
  ttl: number;
}

class CachedHttp {
  private cache = new Map<string, CacheEntry>();

  constructor(private http: Http, private defaultTTL = 300000) {} // 5 minutes

  private getCacheKey(config: any): string {
    // Only cache GET requests
    if (config.method !== 'GET') return '';
    
    return `${config.url}:${JSON.stringify(config.headers || {})}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async request(config: any, cacheTTL?: number): Promise<any> {
    const cacheKey = this.getCacheKey(config);
    
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        return cached.response;
      }
    }

    const result = await this.http.request(config);
    
    if (cacheKey && result.isSuccess()) {
      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now(),
        ttl: cacheTTL || this.defaultTTL
      });
    }

    return result;
  }

  clearCache() {
    this.cache.clear();
  }

  evictExpired() {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Unit Architecture Composition

### Multi-Service HTTP Unit

```typescript
import { Http, Unit } from '@synet/http';

interface ServiceConfig {
  auth: { baseUrl: string; token: string };
  users: { baseUrl: string; apiKey: string };
  analytics: { baseUrl: string; secret: string };
}

class MultiServiceHttp extends Unit<any> {
  private services: Record<string, Http> = {};

  static create(config: ServiceConfig): MultiServiceHttp {
    const props = {
      dna: createUnitSchema({ id: 'multi-service-http', version: '1.0.0' }),
      services: config
    };
    return new MultiServiceHttp(props);
  }

  protected constructor(props: any) {
    super(props);

    // Initialize service-specific HTTP clients
    this.services.auth = Http.create({
      baseUrl: props.services.auth.baseUrl,
      headers: createBearerAuth(props.services.auth.token)
    });

    this.services.users = Http.create({
      baseUrl: props.services.users.baseUrl,
      headers: { 'X-API-Key': props.services.users.apiKey }
    });

    this.services.analytics = Http.create({
      baseUrl: props.services.analytics.baseUrl,
      headers: { 'X-Secret': props.services.analytics.secret }
    });
  }

  // Service-specific methods
  async getUser(id: string) {
    return this.services.users.get(`/users/${id}`);
  }

  async trackEvent(event: string, data: any) {
    return this.services.analytics.post('/events', { event, data });
  }

  async refreshToken() {
    return this.services.auth.post('/refresh');
  }

  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        getUser: this.getUser.bind(this),
        trackEvent: this.trackEvent.bind(this),
        refreshToken: this.refreshToken.bind(this)
      }
    };
  }
}
```

### HTTP Middleware Unit

```typescript
interface MiddlewareConfig {
  baseUrl: string;
  middlewares: Middleware[];
}

interface Middleware {
  name: string;
  execute: (config: any, next: (config: any) => Promise<any>) => Promise<any>;
}

class MiddlewareHttp extends Unit<any> {
  private http: Http;
  private middlewares: Middleware[];

  static create(config: MiddlewareConfig): MiddlewareHttp {
    const props = {
      dna: createUnitSchema({ id: 'middleware-http', version: '1.0.0' }),
      ...config
    };
    return new MiddlewareHttp(props);
  }

  protected constructor(props: any) {
    super(props);
    this.http = Http.create({ baseUrl: props.baseUrl });
    this.middlewares = props.middlewares;
  }

  async request(config: any): Promise<any> {
    let index = 0;

    const next = async (currentConfig: any): Promise<any> => {
      if (index >= this.middlewares.length) {
        return this.http.request(currentConfig);
      }

      const middleware = this.middlewares[index++];
      return middleware.execute(currentConfig, next);
    };

    return next(config);
  }

  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        request: this.request.bind(this),
        get: (url: string) => this.request({ url, method: 'GET' }),
        post: (url: string, data: any) => this.request({ url, method: 'POST', body: data })
      }
    };
  }
}

// Example middleware implementations
const loggingMiddleware: Middleware = {
  name: 'logging',
  async execute(config, next) {
    console.log(`[HTTP] ${config.method} ${config.url}`);
    const start = Date.now();
    
    try {
      const result = await next(config);
      console.log(`[HTTP] ${config.method} ${config.url} - ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.error(`[HTTP] ${config.method} ${config.url} - ERROR: ${error.message}`);
      throw error;
    }
  }
};

const retryMiddleware: Middleware = {
  name: 'retry',
  async execute(config, next) {
    return retryRequest(() => next(config), 3);
  }
};
```

## Serverless Deployment

### Cloudflare Workers

```typescript
// worker.ts
import { get, post, parseJson } from '@synet/http';

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/users') {
      const response = await get(`${env.API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${env.API_TOKEN}` }
      });
      
      const users = parseJson(response);
      return Response.json(users);
    }

    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      const body = await request.json();
      
      const result = await post(`${env.WEBHOOK_URL}/process`, body, {
        headers: { 'X-Secret': env.WEBHOOK_SECRET }
      });
      
      return new Response(result.body, { status: result.status });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

### Vercel Edge Functions

```typescript
// api/proxy.ts
import { get, post, buildUrl } from '@synet/http';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const apiUrl = buildUrl(process.env.API_BASE_URL!, endpoint);
  
  if (request.method === 'GET') {
    const response = await get(apiUrl);
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const response = await post(apiUrl, body);
    return new Response(response.body, { status: response.status });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
```

### AWS Lambda

```typescript
// lambda.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { get, post, parseJson } from '@synet/http';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path, body, headers } = event;
    const apiBaseUrl = process.env.API_BASE_URL!;
    
    if (httpMethod === 'GET' && path.startsWith('/api/')) {
      const response = await get(`${apiBaseUrl}${path}`);
      
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: response.body
      };
    }

    if (httpMethod === 'POST' && body) {
      const data = JSON.parse(body);
      const response = await post(`${apiBaseUrl}${path}`, data);
      
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: response.body
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

## Testing Strategies

### Unit Testing with Mocks

```typescript
// http-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Http } from '@synet/http';

describe('HTTP Client Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should handle authentication flow', async () => {
    // Mock login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve('{"token": "abc123"}')
    });

    // Mock protected resource response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve('{"data": "protected"}')
    });

    const http = Http.create({ baseUrl: 'https://api.example.com' });
    
    // Login
    const loginResult = await http.post('/auth/login', {
      username: 'test',
      password: 'pass'
    });
    
    expect(loginResult.isSuccess()).toBe(true);
    
    // Extract token and create authenticated client
    const loginData = parseJson(loginResult.getValue());
    const authedHttp = Http.create({
      baseUrl: 'https://api.example.com',
      headers: createBearerAuth(loginData.token)
    });
    
    // Access protected resource
    const dataResult = await authedHttp.get('/protected/data');
    expect(dataResult.isSuccess()).toBe(true);
  });
});
```

### Integration Testing

```typescript
// integration.test.ts
import { describe, it, expect } from 'vitest';
import { Http, get } from '@synet/http';

describe('HTTP Integration Tests', () => {
  it('should work with real HTTP endpoints', async () => {
    // Use httpbin.org for testing
    const response = await get('https://httpbin.org/get?test=value');
    
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    
    const data = parseJson(response);
    expect(data.args.test).toBe('value');
  });

  it('should handle different content types', async () => {
    const http = Http.create({ baseUrl: 'https://httpbin.org' });
    
    // JSON response
    const jsonResult = await http.get('/json');
    expect(jsonResult.isSuccess()).toBe(true);
    
    // XML response
    const xmlResult = await http.get('/xml');
    expect(xmlResult.isSuccess()).toBe(true);
    
    // Plain text
    const textResult = await http.get('/robots.txt');
    expect(textResult.isSuccess()).toBe(true);
  });
});
```

## Migration Patterns

### From Axios

```typescript
// Before (Axios)
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

const response = await client.get('/users');
console.log(response.data);

// After (@synet/http)
import { Http, parseJson } from '@synet/http';

const http = Http.create({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

const result = await http.get('/users');
if (result.isSuccess()) {
  const data = parseJson(result.getValue());
  console.log(data);
}
```

### From Fetch

```typescript
// Before (Raw Fetch)
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' })
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();

// After (@synet/http)
import { post, parseJson } from '@synet/http';

const response = await post('https://api.example.com/users', { name: 'Alice' });

if (response.ok) {
  const data = parseJson(response);
  console.log(data);
} else {
  console.error(`HTTP error! status: ${response.status}`);
}
```

### From Node.js HTTP

```typescript
// Before (Node.js http module)
const https = require('https');

const postData = JSON.stringify({ name: 'Alice' });

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});

req.write(postData);
req.end();

// After (@synet/http)
import { post, parseJson } from '@synet/http';

const response = await post('https://api.example.com/users', { name: 'Alice' });
const data = parseJson(response);
console.log(data);
```

## Best Practices

1. **Use Result Pattern for Complex Operations**: Prefer the Unit Architecture pattern with Result types for applications with complex error handling needs.

2. **Choose Pure Functions for Serverless**: Use pure functions (`get`, `post`, etc.) in serverless environments for optimal performance.

3. **Implement Circuit Breakers**: For production services, implement circuit breakers to handle downstream failures gracefully.

4. **Cache Appropriately**: Cache GET requests when possible, but be mindful of cache invalidation strategies.

5. **Handle Authentication Proactively**: Implement token refresh and rotation strategies before they become critical.

6. **Monitor and Log**: Add comprehensive logging and monitoring to track HTTP performance and errors.

7. **Test at Multiple Levels**: Unit test with mocks, integration test with real endpoints, and load test under realistic conditions.

8. **Compose Units Thoughtfully**: Use Unit Architecture composition to create specialized HTTP clients for different services and use cases.

This manual provides comprehensive patterns for building robust, production-ready HTTP clients using @synet/http. Choose the patterns that best fit your architecture and requirements.
