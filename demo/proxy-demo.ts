/**
 * HTTP Proxy Integration Demo
 * Demonstrates how proxy connections integrate with HTTP requests
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Http, type ProxyConnection } from '../src/http.unit.js';

async function main() {
  console.log('🔗 HTTP Proxy Integration Demo\n');

  // Create HTTP unit
  const http = Http.create({
    baseUrl: 'https://httpbin.org',
    timeout: 10000
  });

  console.log('📊 HTTP Unit:', http.whoami());
  console.log();

   const proxyConfigPath = path.join('private', 'proxy.json');
   const proxyConfig = JSON.parse(readFileSync(proxyConfigPath, 'utf-8')) as ProxyConnection;

  // Example proxy connection (as would come from @synet/proxy)
  const proxyConnection: ProxyConnection = {
    id: proxyConfig.id,
    host: proxyConfig.host,
    port: proxyConfig.port,
    username: proxyConfig.username,
    password: proxyConfig.password,
    protocol: proxyConfig.protocol,
    country: proxyConfig.country
  };

  try {
    console.log('🌐 Testing direct request (no proxy) to get real IP...');
    const directResult = await http.get('/ip');
    
    let directIP = 'unknown';
    if (directResult.isSuccess) {
      console.log('✅ Direct request successful');
      console.log('   Status:', directResult.value.response.status);
      console.log(`   Duration: ${directResult.value.response.duration}ms`);
      
      const parsed = directResult.value.parsed as { origin?: string };
      if (parsed?.origin) {
        directIP = parsed.origin;
        console.log('   Direct IP:', directIP);
      }
    } else {
      console.log('❌ Direct request failed:', directResult.error);
    }

    console.log();
    console.log('🔗 Testing request with proxy to verify IP change...');
    
    // Request with proxy to test IP change
    const proxiedResult = await http.request({
      url: '/ip',
      method: 'GET',
      proxy: proxyConnection,
      headers: {
        'X-Test-Proxy': 'true'
      }
    });

    if (proxiedResult.isSuccess) {
      console.log('✅ Proxied request configuration passed successfully');
      console.log('   Status:', proxiedResult.value.response.status);
      console.log(`   Duration: ${proxiedResult.value.response.duration}ms`);
      console.log(`   Proxy used: ${proxyConnection.host}:${proxyConnection.port}`);
      
      // Show IP from proxied request
      const parsed = proxiedResult.value.parsed as { origin?: string };
      if (parsed?.origin) {
        const proxiedIP = parsed.origin;
        console.log('   Proxied IP:', proxiedIP);
        
        // Compare IPs
        if (directIP !== 'unknown' && proxiedIP !== directIP) {
          console.log('🎯 SUCCESS: IP changed through proxy!');
          console.log(`   Direct:  ${directIP}`);
          console.log(`   Proxied: ${proxiedIP}`);
        } else if (directIP !== 'unknown' && proxiedIP === directIP) {
          console.log('⚠️  WARNING: IP unchanged - proxy may not be working');
        } else {
          console.log('ℹ️  IP comparison inconclusive');
        }
      }
      
      // Show response headers for debugging
      console.log('   Response Headers:');
      for (const [key, value] of Object.entries(proxiedResult.value.response.headers)) {
        console.log(`     ${key}: ${value}`);
      }
    } else {
      console.log('❌ Proxied request failed:', proxiedResult.error);
    }

    console.log();
    console.log('Proxy Connection Details:');
    console.log('   ID:', proxyConnection.id);
    console.log('   Endpoint:', `${proxyConnection.protocol}://${proxyConnection.host}:${proxyConnection.port}`);
    console.log('   Country:', proxyConnection.country);
    console.log('   Has Auth:', !!(proxyConnection.username && proxyConnection.password));

  } catch (error) {
    console.error('💥 Demo failed:', error instanceof Error ? error.message : String(error));
  }

  console.log();
  console.log('ℹ️  Note: Native fetch() API does not support HTTP proxies directly.');
  console.log('   This demo shows how proxy configuration is passed through the HTTP unit.');
  console.log('   Real proxy support would require platform-specific implementations:');
  console.log('   - Node.js: undici, https-proxy-agent, socks-proxy-agent');
  console.log('   - Browser: Proxy configuration handled by browser/OS');
  console.log();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as httpProxyDemo };
