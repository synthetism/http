/**
 * Test HTTP Unit with Proxy Error Handling
 * This tests the enhanced proxy error messages from the HTTP unit
 */

import { Http } from '../src/http.unit';
import { readFileSync } from 'node:fs';
import path from 'node:path';

interface ProxyConnection {
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly protocol: 'http' | 'socks5';
  readonly country?: string;
}

async function testHttpUnit() {
  console.log('🔧 HTTP Unit Proxy Error Test\n');

  // Create HTTP unit
  const http = Http.create({
    timeout: 15000,
    retries: 1
  });

  console.log('✅ HTTP Unit created:', http.whoami());
  console.log();

  // Load proxy config
  const proxyConfigPath = path.join('private', 'proxy.json');
  const proxyConfig = JSON.parse(readFileSync(proxyConfigPath, 'utf-8')) as ProxyConnection;

  console.log('📋 Testing with proxy:');
  console.log(`   ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
  console.log(`   Auth: ${proxyConfig.username ? '✅ configured' : '❌ missing'}`);
  console.log();

  // Test 1: Working proxy request  
  console.log('🌐 Test 1: Working proxy request');
  try {
    const result = await http.get('https://httpbin.org/ip', {
      proxy: proxyConfig
    });

    if (result.isSuccess) {
      console.log('✅ Proxy request successful');
      console.log('   Status:', result.value.response.status);
      console.log('   IP:', JSON.parse(result.value.response.body).origin);
    } else {
      console.log('❌ Proxy request failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Proxy request exception:', error);
  }

  console.log();

  // Test 2: Invalid credentials (should show enhanced error message)
  console.log('🔍 Test 2: Invalid proxy credentials (enhanced error)');
  try {
    const invalidProxy = {
      ...proxyConfig,
      username: 'invalid_user',
      password: 'invalid_pass'
    };

    const result = await http.get('https://httpbin.org/ip', {
      proxy: invalidProxy
    });

    if (result.isSuccess) {
      console.log('⚠️  Unexpected success with invalid credentials');
    } else {
      console.log('✅ Expected failure with enhanced error message:');
      console.log('---');
      console.log(result.error);
      console.log('---');
    }
  } catch (error) {
    console.log('✅ Exception with enhanced error message:');
    console.log('---');
    console.log(error);
    console.log('---');
  }

  console.log();

  // Test 3: No proxy (direct request)
  console.log('🌐 Test 3: Direct request (no proxy)');
  try {
    const result = await http.get('https://httpbin.org/ip');

    if (result.isSuccess) {
      console.log('✅ Direct request successful');
      console.log('   Status:', result.value.response.status);
      console.log('   IP:', JSON.parse(result.value.response.body).origin);
    } else {
      console.log('❌ Direct request failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Direct request exception:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testHttpUnit().catch(console.error);
}

export { testHttpUnit };
