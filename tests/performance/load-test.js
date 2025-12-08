/**
 * Load Testing Script
 *
 * Tests API performance under load using autocannon
 */

const autocannon = require('autocannon');

const instance = autocannon({
  url: process.env.TEST_API_URL || 'http://localhost:3000',
  connections: 100,
  duration: 30, // 30 seconds
  pipelining: 1,
  requests: [
    {
      method: 'GET',
      path: '/',
    },
  ],
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (results) => {
  console.log('\n\n📊 Load Test Results:');
  console.log('════════════════════════════════════════');
  console.log(`  Total Requests: ${results.requests.total}`);
  console.log(`  Duration: ${results.duration}s`);
  console.log(`  Throughput: ${results.throughput.mean.toFixed(2)} req/s`);
  console.log('  Latency:');
  console.log(`    Mean: ${results.latency.mean.toFixed(2)}ms`);
  console.log(`    P50: ${results.latency.p50}ms`);
  console.log(`    P95: ${results.latency.p95}ms`);
  console.log(`    P99: ${results.latency.p99}ms`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  Timeouts: ${results.timeouts}`);
  console.log('════════════════════════════════════════\n');

  // Assert performance requirements
  if (results.latency.p95 > 500) {
    console.error('❌ FAIL: P95 latency exceeds 500ms');
    process.exit(1);
  }

  if (results.errors > 0) {
    console.error('❌ FAIL: Errors occurred during load test');
    process.exit(1);
  }

  console.log('✅ Load test passed!');
});
