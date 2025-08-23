/**
 * Axios Proxy Test Script
 * Simple test to see what errors and headers we get from the proxy
 */

import axios from 'axios';
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

async function testWithAxios() {
  console.log('🔍 Axios Proxy Test\n');

  // Load proxy config
  const proxyConfigPath = path.join('private', 'proxy.json');
  const proxyConfig = JSON.parse(readFileSync(proxyConfigPath, 'utf-8')) as ProxyConnection;

  console.log('📋 Proxy Config:');
  console.log(`   Host: ${proxyConfig.host}:${proxyConfig.port}`);
  console.log(`   Protocol: ${proxyConfig.protocol}`);
  console.log(`   Auth: ${proxyConfig.username ? '✅ yes' : '❌ no'}`);
  console.log(`   Country: ${proxyConfig.country}`);
  console.log();

  // Test 1: Direct request (no proxy)
  console.log('🌐 Test 1: Direct request to httpbin.org/ip');
  try {
    const directResponse = await axios.get('https://httpbin.org/ip', {
      timeout: 10000
    });
    console.log('✅ Direct request successful');
    console.log('   Status:', directResponse.status);
    console.log('   IP:', directResponse.data.origin);
  } catch (error) {
    console.log('❌ Direct request failed:', error.message);
  }

  console.log();

  // Test 2: Proxy request with axios
  console.log('🔗 Test 2: Proxy request with axios');
  try {
    const proxyResponse = await axios.get('https://httpbin.org/ip', {
      proxy: {
        protocol: proxyConfig.protocol,
        host: proxyConfig.host,
        port: proxyConfig.port,
        auth: proxyConfig.username && proxyConfig.password ? {
          username: proxyConfig.username,
          password: proxyConfig.password
        } : undefined
      },
      timeout: 15000
    });

    console.log('✅ Proxy request successful');
    console.log('   Status:', proxyResponse.status);
    console.log('   IP:', proxyResponse.data.origin);
    console.log('   Headers:', Object.keys(proxyResponse.headers).join(', '));

  } catch (error: unknown) {
    const axiosError = error as { 
      message?: string; 
      code?: string; 
      response?: { 
        status?: number; 
        statusText?: string; 
        headers?: Record<string, string>; 
        data?: unknown; 
      }; 
      config?: { 
        url?: string; 
        method?: string; 
        proxy?: unknown; 
      }; 
    };
    console.log('❌ Proxy request failed');
    console.log('   Error message:', axiosError.message);
    console.log('   Error code:', axiosError.code);
    
    // Check if we have response details in the error
    if (axiosError.response) {
      console.log('   📋 Error Response Details:');
      console.log('      Status:', axiosError.response.status);
      console.log('      Status Text:', axiosError.response.statusText);
      console.log('      Headers:');
      for (const [key, value] of Object.entries(axiosError.response.headers || {})) {
        console.log(`         ${key}: ${value}`);
      }
      if (axiosError.response.data) {
        console.log('      Response Body:', typeof axiosError.response.data === 'string' ? 
          axiosError.response.data.substring(0, 300) : JSON.stringify(axiosError.response.data).substring(0, 300));
      }
    }

    // Check for specific proxy errors
    if (axiosError.config) {
      console.log('   📋 Request Config:');
      console.log('      URL:', axiosError.config.url);
      console.log('      Method:', axiosError.config.method);
      console.log('      Proxy:', axiosError.config.proxy);
    }
  }

  console.log();

  // Test 3: Direct connection to proxy (to get 407 headers)
  console.log('🔍 Test 3: Direct HTTP request to proxy server');
  try {
    const directProxyResponse = await axios.get(`http://${proxyConfig.host}:${proxyConfig.port}/`, {
      headers: {
        'Proxy-Authorization': proxyConfig.username && proxyConfig.password ? 
          `Basic ${Buffer.from(`${proxyConfig.username}:${proxyConfig.password}`).toString('base64')}` : 
          'Basic invalid',
        'User-Agent': 'Axios-Test/1.0'
      },
      timeout: 10000,
      validateStatus: () => true // Accept all status codes
    });

    console.log('   Status:', directProxyResponse.status);
    console.log('   Status Text:', directProxyResponse.statusText);
    console.log('   📋 Direct Proxy Response Headers:');
    for (const [key, value] of Object.entries(directProxyResponse.headers)) {
      console.log(`      ${key}: ${value}`);
    }

    if (directProxyResponse.data) {
      const responseText = typeof directProxyResponse.data === 'string' ? 
        directProxyResponse.data : JSON.stringify(directProxyResponse.data);
      if (responseText.trim()) {
        console.log('   📄 Response Body:');
        console.log('     ', responseText.substring(0, 400));
      }
    }

  } catch (directError: unknown) {
    console.log('   ❌ Direct proxy request failed:', (directError as Error).message);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWithAxios().catch(console.error);
}

export { testWithAxios };
