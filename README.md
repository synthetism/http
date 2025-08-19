# @synet/http

```bash
 __  __  ______  ______  ____            __  __              __      
/\ \/\ \/\__  _\/\__  _\/\  _`\         /\ \/\ \          __/\ \__   
\ \ \_\ \/_/\ \/\/_/\ \/\ \ \L\ \       \ \ \ \ \    ___ /\_\ \ ,_\  
 \ \  _  \ \ \ \   \ \ \ \ \ ,__/        \ \ \ \ \ /' _ `\/\ \ \ \/  
  \ \ \ \ \ \ \ \   \ \ \ \ \ \/          \ \ \_\ \/\ \/\ \ \ \ \ \_ 
   \ \_\ \_\ \ \_\   \ \_\ \ \_\           \ \_____\ \_\ \_\ \_\ \__\
    \/_/\/_/  \/_/    \/_/  \/_/            \/_____/\/_/\/_/\/_/\/__/
                                                                                  
version: 1.0.1                                                   
```

Modern, Unit Architecture-compliant HTTP client for TypeScript applications. Built for both Unit-based composition and serverless deployment.

## Features

-  **Unit Architecture Compliant** - Teaching/learning contracts with capability composition
-  **Zero Dependencies** - Uses native fetch API (Node.js 18+ / Browser)
-  **Cross-Platform** - Browser, Node.js, Cloudflare Workers, Vercel Edge
- **Type-Safe** - Full TypeScript support with comprehensive types
- **Result Pattern** - Explicit error handling for complex operations
- **Pure Functions** - Serverless-ready stateless operations
- **Built-in Retry** - Exponential backoff retry logic
- **Multiple Patterns** - Unit Architecture + Pure Functions

## Quick Start

### Unit Architecture Pattern

```typescript
import { Http } from '@synet/http';

// Create HTTP unit
const http = Http.create({
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer your-token' },
  timeout: 10000
});

// Basic GET request
const result = await http.get('/users');
if (result.isSuccess()) {
  console.log(result.getValue().body);
}

// POST with data
const createResult = await http.post('/users', { 
  name: 'Alice', 
  email: 'alice@example.com' 
});

if (createResult.isFailure()) {
  console.error(createResult.getError());
}
```

### Pure Functions Pattern

```typescript
import { get, post, buildUrl, parseJson } from '@synet/http';

// Direct HTTP calls
const response = await get('https://api.example.com/users');
console.log(response.status, response.body);

// Parse JSON from response
const data = parseJson(response);
console.log(data);

// Build URLs with query parameters
const url = buildUrl('https://api.example.com', '/users', { 
  page: '1', 
  limit: '10' 
});
```

## Installation

```bash
npm install @synet/http
```

## Basic Usage

### HTTP Methods

```typescript
// GET request
const users = await http.get('/users');

// POST with JSON data
const created = await http.post('/users', {
  name: 'Bob',
  email: 'bob@example.com'
});

// PUT request
const updated = await http.put('/users/123', { name: 'Robert' });

// DELETE request
const deleted = await http.delete('/users/123');

// PATCH request
const patched = await http.patch('/users/123', { email: 'robert@example.com' });
```

### Query Parameters

```typescript
// Using buildUrl helper
const url = buildUrl('https://api.example.com', '/search', {
  q: 'javascript',
  page: '1',
  sort: 'date'
});

// Direct with HTTP unit
const results = await http.get('/search', {
  query: { q: 'javascript', page: '1' }
});
```

### Authentication

```typescript
import { createBearerAuth, createBasicAuth } from '@synet/http';

// Bearer token
const http = Http.create({
  baseUrl: 'https://api.example.com',
  headers: createBearerAuth('your-jwt-token')
});

// Basic auth
const httpBasic = Http.create({
  baseUrl: 'https://api.example.com',
  headers: createBasicAuth('username', 'password')
});
```

### Error Handling

```typescript
// Result pattern (recommended for complex operations)
const result = await http.get('/users');

result.match({
  success: (response) => {
    console.log('Success:', response.status);
    const data = parseJson(response);
    return data;
  },
  failure: (error) => {
    console.error('Failed:', error.message);
    return null;
  }
});

// Direct response handling
const response = await get('https://api.example.com/users');
if (response.ok) {
  console.log('Success!');
} else {
  console.error(`Error: ${response.status} ${response.statusText}`);
}
```

### Status Code Helpers

```typescript
import { 
  isSuccessStatus, 
  isClientError, 
  isServerError, 
  getStatusCategory 
} from '@synet/http';

const response = await get('/api/data');

if (isSuccessStatus(response.status)) {
  console.log('Success!');
} else if (isClientError(response.status)) {
  console.log('Client error - check your request');
} else if (isServerError(response.status)) {
  console.log('Server error - try again later');
}

console.log('Category:', getStatusCategory(response.status));
```

### Retry Logic

```typescript
import { retryRequest, get } from '@synet/http';

// Retry with exponential backoff
const response = await retryRequest(
  () => get('https://unreliable-api.com/data'),
  3, // max retries
  1000 // base delay (ms)
);
```

## Unit Architecture Integration

### Teaching Capabilities

```typescript
const http = Http.create({ baseUrl: 'https://api.example.com' });

// Teach HTTP capabilities to other units
const contract = http.teach();
// contract.capabilities includes: get, post, put, delete, patch, request
```

### Learning from Other Units

```typescript
// Learn capabilities from other units
const enhancedHttp = http.learn([
  cryptoUnit.teach(), // Adds crypto.encrypt, crypto.decrypt
  authUnit.teach()    // Adds auth.sign, auth.verify
]);

// Now can use learned capabilities
if (enhancedHttp.can('crypto.encrypt')) {
  const encrypted = await enhancedHttp.execute('crypto.encrypt', sensitiveData);
}
```

### Unit Information

```typescript
// Get unit identity and capabilities
console.log(http.whoami()); // Unit identity
console.log(http.capabilities()); // Available capabilities
console.log(http.help()); // Usage documentation
```

## Configuration Options

```typescript
interface HttpConfig {
  baseUrl?: string;           // Base URL for requests
  headers?: Record<string, string>; // Default headers
  timeout?: number;           // Request timeout (ms)
  retries?: number;           // Max retry attempts
  retryDelay?: number;        // Base retry delay (ms)
}

const http = Http.create({
  baseUrl: 'https://api.example.com',
  headers: { 
    'User-Agent': 'MyApp/1.0',
    'Accept': 'application/json'
  },
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
});
```

## Response Format

```typescript
interface HttpResponse {
  url: string;           // Request URL
  status: number;        // HTTP status code
  statusText: string;    // HTTP status text
  headers: Record<string, string>; // Response headers
  body: string;          // Response body
  ok: boolean;           // true if status 200-299
  timestamp: Date;       // Request timestamp
  duration: number;      // Request duration (ms)
}
```

## Serverless Deployment

Perfect for serverless environments:

```typescript
// Cloudflare Workers
export default {
  async fetch(request) {
    const response = await get('https://api.external.com/data');
    return new Response(response.body);
  }
};

// Vercel Edge Function
import { get } from '@synet/http';

export default async function handler(req) {
  const data = await get('https://api.example.com/users');
  return Response.json(parseJson(data));
}
```

## TypeScript Support

Full type safety with intelligent autocompletion:

```typescript
import type { HttpResponse, HttpConfig, TeachingContract } from '@synet/http';

// All functions and methods are fully typed
const response: HttpResponse = await get('/users');
const config: HttpConfig = { baseUrl: 'https://api.example.com' };
```

## Browser Support

Works in all modern browsers with native fetch:

```html
<script type="module">
  import { get } from 'https://unpkg.com/@synet/http';
  
  const response = await get('/api/users');
  console.log(response);
</script>
```

## Next Steps

- See [MANUAL.md](./MANUAL.md) for advanced usage patterns
- Check [examples/](./examples/) for real-world scenarios
- Read about [Unit Architecture](../unit/README.md) for composition patterns

## License

MIT - See LICENSE file for details
