# Contributing to @synet/http

Thank you for your interest in contributing to @synet/http! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New HTTP Features](#adding-new-http-features)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Getting Started

@synet/http follows [Unit Architecture](https://github.com/synthetism/unit) principles. Before contributing, please familiarize yourself with:

- Unit Architecture doctrine and patterns
- Consciousness trinity (Capabilities + Schema + Validator)
- Teaching/learning paradigm for capability sharing
- Immutable value objects with identity

## Development Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/synthetism/http.git
cd http
npm install
```

2. **Set up test credentials (optional):**
```bash
# Copy proxy configuration for proxy testing (optional)
cp private/proxy.json.example private/proxy.json

# Fill in proxy credentials if testing proxy functionality
```

3. **Run tests:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode during development
npm run coverage      # Generate coverage report
```

4. **Run demos:**
```bash
npm run demo              # Basic HTTP demo
npm run demo:proxy        # Proxy integration demo
npm run demo:retry        # Retry mechanism demo
npm run demo:simple       # Simple HTTP test
```

5. **Development workflow:**
```bash
npm run dev:test          # Interactive test development
npm run lint              # Check code style
npm run lint:fix          # Auto-fix style issues
npm run format            # Format code
```

## Code Style

### Unit Architecture Compliance

All code must follow [Unit Architecture Doctrine v1.1.1](https://github.com/synthetism/unit/blob/main/DOCTRINE.md):

```typescript
// ✅ GOOD: Follows Unit Architecture
export class Http extends Unit<HttpProps> {
  protected constructor(props: HttpProps) {
    super(props);
  }

  protected build(): UnitCore {
    const capabilities = Capabilities.create(this.dna.id, {
      request: (...args: unknown[]) => this.request(args[0] as HttpRequest)
    });
    // ... schema and validator
    return { capabilities, schema, validator };
  }

  static create(config: HttpConfig): Http {
    // Factory pattern
  }
}

// ❌ BAD: Public constructor, no capabilities
export class HttpClient {
  constructor(config: any) { }
  request(url: string) { }
}
```

### TypeScript Standards

- **Strict typing:** No `any` types, prefer proper interfaces
- **Result pattern:** Use `Result<T>` for complex operations that can fail
- **Error boundaries:** Throw for simple operations, Result for complex ones

```typescript
// ✅ GOOD: Result pattern for complex HTTP operations
async request(config: HttpRequest): Promise<Result<RequestResult>> {
  try {
    const result = await this.executeRequest(config);
    return Result.success(result);
  } catch (error) {
    return Result.fail('Request failed', error);
  }
}

// ✅ GOOD: Throws for simple utility operations
buildUrl(path: string, params?: Record<string, string>): string {
  if (!path) throw new Error('Path is required');
  // ... implementation
}
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `http-client.ts`)
- **Classes:** `PascalCase` (e.g., `HttpUnit`)
- **Interfaces:** `PascalCase` with descriptive names (e.g., `HttpRequest`)
- **Methods:** `camelCase` (e.g., `buildUrl`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)

## Testing

### Test Structure

Follow the existing test patterns:

```typescript
describe('Http Unit', () => {
  let http: Http;

  beforeEach(() => {
    http = Http.create({
      baseUrl: 'https://httpbin.org',
      timeout: 5000
    });
  });

  describe('GET requests', () => {
    it('should handle successful requests', async () => {
      const result = await http.get('/status/200');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.response.status).toBe(200);
    });

    it('should handle failed requests with Result pattern', async () => {
      const result = await http.get('/status/404');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('404');
    });
  });
});
```

### Test Categories

1. **Unit tests:** Test individual methods and logic
2. **Integration tests:** Test HTTP requests against real endpoints
3. **Error tests:** Test error handling and edge cases
4. **Performance tests:** Test timeout and retry mechanisms

### Mock Guidelines

- Use real HTTP endpoints (httpbin.org) for integration tests
- Mock only when testing error conditions or rate limits
- Avoid mocking core HTTP functionality

## Submitting Changes

### Pull Request Process

1. **Create feature branch:**
```bash
git checkout -b feature/add-websocket-support
git checkout -b fix/timeout-handling
git checkout -b docs/update-examples
```

2. **Follow commit message format:**
```
type(scope): description

feat(http): add WebSocket support with proxy integration
fix(retry): handle network timeouts correctly
docs(contributing): add testing guidelines
test(integration): add proxy authentication tests
```

3. **Ensure all checks pass:**
```bash
npm run lint:fix        # Fix style issues
npm test               # All tests pass
npm run coverage       # Maintain >90% coverage
npm run build          # TypeScript compiles
```

4. **Update documentation:**
- Add/update JSDoc comments for new methods
- Update README.md if adding major features
- Add examples to `demo/` directory
- Update CHANGELOG.md

### Review Criteria

- ✅ Follows Unit Architecture doctrine
- ✅ Includes comprehensive tests
- ✅ Maintains backward compatibility
- ✅ Proper error handling (Result pattern)
- ✅ TypeScript strict compliance
- ✅ Performance considerations
- ✅ Documentation updates

## Adding New HTTP Features

### Feature Categories

1. **Request/Response Enhancement:**
   - New HTTP methods
   - Header manipulation
   - Body transformation
   - Response parsing

2. **Protocol Support:**
   - WebSocket connections
   - Server-Sent Events
   - HTTP/2 features

3. **Reliability Features:**
   - Retry strategies
   - Circuit breakers
   - Rate limiting
   - Connection pooling

### Implementation Guidelines

#### 1. Capability-First Design

```typescript
// Add to capabilities in build() method
const capabilities = Capabilities.create(this.dna.id, {
  // Existing capabilities...
  websocket: (...args: unknown[]) => this.websocket(args[0] as WebSocketConfig),
});
```

#### 2. Schema Definition

```typescript
// Add to schema in build() method
const schema = Schema.create(this.dna.id, {
  // Existing schemas...
  websocket: {
    name: 'websocket',
    description: 'Establish WebSocket connection with proxy support',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'WebSocket URL' },
        protocols: { type: 'array', description: 'WebSocket protocols' }
      },
      required: ['url']
    }
  }
});
```

#### 3. Implementation

```typescript
/**
 * WebSocket connection (Result - complex network operation)
 */
async websocket(config: WebSocketConfig): Promise<Result<WebSocketConnection>> {
  try {
    // Implementation here
    return Result.success(connection);
  } catch (error) {
    return Result.fail('WebSocket connection failed', error);
  }
}
```

### Proxy Integration

All new features should support proxy connections:

```typescript
interface NewFeatureConfig {
  // Standard config...
  proxy?: ProxyConnection;  // Always include proxy support
}
```

## Documentation

### Code Documentation

- **Classes:** Comprehensive JSDoc with examples
- **Methods:** Parameter and return value documentation
- **Interfaces:** Property descriptions and usage examples

```typescript
/**
 * Execute HTTP request with full configuration
 * 
 * @param config - Request configuration including URL, method, headers
 * @returns Promise resolving to Result with response data
 * 
 * @example
 * ```typescript
 * const result = await http.request({
 *   url: '/api/users',
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 * 
 * if (result.isSuccess) {
 *   console.log(result.value.parsed);
 * }
 * ```
 */
async request(config: HttpRequest): Promise<Result<RequestResult>> {
  // Implementation
}
```

### README Updates

- Add new features to feature list
- Update usage examples
- Document new configuration options
- Add performance notes

### Demo Files

Create comprehensive demos in `demo/` directory:

```typescript
// demo/websocket-demo.ts
async function demonstrateWebSocket() {
  const http = Http.create({ baseUrl: 'wss://echo.websocket.org' });
  
  const connection = await http.websocket({ url: '/ws' });
  if (connection.isSuccess) {
    console.log('WebSocket connected!');
  }
}
```

## Issue Reporting

### Bug Reports

Use the issue template and include:

1. **Environment information:**
   - Node.js version
   - Operating system
   - Package version

2. **Reproduction steps:**
   - Minimal code example
   - Expected vs actual behavior
   - Error messages/stack traces

3. **Context:**
   - Proxy configuration (if applicable)
   - Network environment
   - Related packages

### Feature Requests

1. **Use case description:**
   - What problem does this solve?
   - How would you use this feature?

2. **API design suggestion:**
   - Proposed method signatures
   - Configuration options
   - Integration points

3. **Implementation considerations:**
   - Complexity assessment
   - Breaking change implications
   - Performance impact

## Development Tips

### Testing HTTP Behavior

```bash
# Use httpbin.org for testing HTTP scenarios
npm run demo  # Test against real endpoints

# Test different HTTP status codes
curl https://httpbin.org/status/404
curl https://httpbin.org/status/500

# Test with proxy
npm run demo:proxy
```

### Debugging

```typescript
// Enable detailed logging during development
const http = Http.create({
  baseUrl: 'https://httpbin.org',
  timeout: 5000
});

// Check unit state
console.log(http.whoami());
console.log(http.capabilities().list());
```

### Performance Testing

```typescript
// Test with various timeouts and retry scenarios
const results = await Promise.allSettled([
  http.get('/delay/1'),  // 1 second delay
  http.get('/delay/5'),  // 5 second delay
  http.get('/status/500') // Server error
]);
```

## Getting Help

- **Documentation:** Check README.md and inline comments
- **Examples:** See `demo/` directory for usage patterns
- **Issues:** Search existing issues before creating new ones
- **Discussions:** Use GitHub Discussions for questions
- **Unit Architecture:** Read the [Unit Architecture guide](https://github.com/synthetism/unit)

## License

By contributing to @synet/http, you agree that your contributions will be licensed under the MIT License.
