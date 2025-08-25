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
  readonly username: string;
  readonly password: string;
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
  let directIP: string | null = null;
  try {
    const directResponse = await axios.get('https://httpbin.org/ip', {
      timeout: 10000
    });
    console.log('✅ Direct request successful');
    console.log('   Status:', directResponse.status);
    directIP = directResponse.data.origin;
    console.log('   IP:', directIP);
  } catch (error) {
    console.log('❌ Direct request failed:', error.message);
  }

  console.log();



  // Test 2: Multiple proxy requests with 1-second delay
  console.log('🔄 Test 2: Multiple proxy requests with 1-second delay');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n📡 Request ${i}/5...`);
    
    if (i > 1) {
      console.log(`   ⏳ Waiting ${i} seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
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

      console.log(`   ✅ Success - Status: ${proxyResponse.status}, IP: ${proxyResponse.data.origin}`);
    } catch (error: unknown) {
      const axiosError = error as { message?: string; response?: { status?: number } };
      console.log(`   ❌ Failed - ${axiosError.message}`);
      if (axiosError.response?.status === 407) {
        console.log('   🔍 Got 407 - auth issue even with IP whitelisting');
        break;
      }
    }
  }
   
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWithAxios().catch(console.error);
}

export { testWithAxios };
