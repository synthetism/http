/**
 * HTTP Error Handling Test
 * Tests different error scenarios to verify status extraction
 */

import { Http } from '../src/http.unit';

async function testErrorHandling() {
  console.log('🔧 HTTP Error Handling Test\n');

  const http = Http.create({ timeout: 5000 });

  // Test 1: Network error (domain doesn't exist)
  console.log('🌐 Test 1: Network error (ENOTFOUND)');
  try {
    const result = await http.get('https://api.example.com/users');
    if (result.isFailure) {
      console.log('❌ Expected network error:', result.error);
    } else {
      console.log('⚠️  Unexpected success');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log();

  // Test 2: HTTP 404 error (valid domain, invalid path)
  console.log('🌐 Test 2: HTTP 404 error');
  try {
    const result = await http.get('https://httpbin.org/status/404');
    if (result.isFailure) {
      console.log('❌ Expected HTTP error:', result.error);
    } else {
      console.log('⚠️  Unexpected success');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log();

  // Test 3: HTTP 500 error
  console.log('🌐 Test 3: HTTP 500 error');
  try {
    const result = await http.get('https://httpbin.org/status/500');
    if (result.isFailure) {
      console.log('❌ Expected HTTP error:', result.error);
    } else {
      console.log('⚠️  Unexpected success');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log();

  // Test 4: Success case for comparison
  console.log('🌐 Test 4: Success case');
  try {
    const result = await http.get('https://httpbin.org/status/200');
    if (result.isSuccess) {
      console.log('✅ Success:', result.value.response.status);
    } else {
      console.log('❌ Unexpected failure:', result.error);
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }

  console.log();

  // Test 5: Timeout error
  console.log('🌐 Test 5: Timeout error');
  try {
    const result = await http.get('https://httpbin.org/delay/10', { timeout: 2000 });
    if (result.isFailure) {
      console.log('❌ Expected timeout error:', result.error);
    } else {
      console.log('⚠️  Unexpected success');
    }
  } catch (error) {
    console.log('❌ Exception:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorHandling().catch(console.error);
}

export { testErrorHandling };
