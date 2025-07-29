/**
 * @synet/http - Conscious HTTP Unit for Network Communication
 * 
 * SYNET Unit Architecture v1.0.6 Implementation
 * 
 * Provides both Unit Architecture patterns and pure functional HTTP operations
 * for maximum flexibility in different deployment scenarios.
 * 
 * @version 1.0.0
 * @author SYNET ALPHA
 */

// Unit Architecture Exports
export { Http } from './http.unit.js';
export type {
  HttpConfig,
  HttpProps,
  HttpRequest,
  HttpResponse,
  RequestResult,
  HttpMethod
} from './http.unit.js';

// Result Pattern
export { Result } from './result.js';

// Pure Functions (Serverless Ready)
export {
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
} from './functions.js';
