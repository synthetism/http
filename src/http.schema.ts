import type { ToolSchema } from "@synet/unit";
/**
 * HTTP Unit Schema Definitions
 * 
 * Comprehensive schemas for all HTTP operations following Unit Architecture
 * 
 * @author SYNET ALPHA
 */

export function HttpSchema():  Record<string, ToolSchema> {
  return {
    request: {
      name: 'request',
      description: 'Execute HTTP request with full configuration',
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Request URL (absolute or relative to baseUrl)'
          },
          method: { 
            type: 'string', 
            description: 'HTTP method', 
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
          },
          headers: { 
            type: 'object', 
            description: 'Request headers'
          },
          body: { 
            type: 'string', 
            description: 'Request body (string or JSON)'
          },
          timeout: { 
            type: 'number', 
            description: 'Request timeout in milliseconds'
          },
          proxy: { 
            type: 'object', 
            description: 'Proxy connection configuration'
          }
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
  };
}