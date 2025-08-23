/**
 * Quick test to verify error format matches expectations
 */

import { Http } from '../src/http.unit';

async function quickTest() {
  const http = Http.create();
  
  console.log('Testing error formats:');
  
  // Test the exact scenario from your test
  const result = await http.get('https://httpbin.org/status/404');
  
  if (result.isFailure) {
    console.log('Error message:', result.error);
    console.log('Starts with "HTTP 404":', result.error.startsWith('HTTP 404'));
  }
}

quickTest().catch(console.error);
