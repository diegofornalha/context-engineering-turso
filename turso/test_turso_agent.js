/**
 * Test script for Turso A2A Agent
 */

const http = require('http');

const PORT = 4243;
const HOST = 'localhost';

// Test discovery endpoint
function testDiscover() {
  console.log('🔍 Testing /discover endpoint...');
  
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/discover',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Discovery response:', JSON.parse(data));
      testCommunicate();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Discovery error:', error.message);
  });

  req.end();
}

// Test communicate endpoint
function testCommunicate() {
  console.log('\n📨 Testing /communicate endpoint...');
  
  const postData = JSON.stringify({
    type: 'query',
    query: 'SELECT * FROM test_table'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/communicate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Communicate response:', JSON.parse(data));
      testDelegate();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Communicate error:', error.message);
  });

  req.write(postData);
  req.end();
}

// Test delegate endpoint
function testDelegate() {
  console.log('\n📋 Testing /delegate endpoint...');
  
  const postData = JSON.stringify({
    type: 'migrate',
    id: 'test-migration-' + Date.now(),
    details: {
      from_version: '1.0.0',
      to_version: '2.0.0'
    }
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/delegate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Delegate response:', JSON.parse(data));
      testHealth();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Delegate error:', error.message);
  });

  req.write(postData);
  req.end();
}

// Test health endpoint
function testHealth() {
  console.log('\n💚 Testing /health endpoint...');
  
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Health response:', JSON.parse(data));
      console.log('\n🎉 All tests completed!');
    });
  });

  req.on('error', (error) => {
    console.error('❌ Health error:', error.message);
  });

  req.end();
}

// Start tests
console.log(`🧪 Testing Turso A2A Agent on port ${PORT}...\n`);
testDiscover();