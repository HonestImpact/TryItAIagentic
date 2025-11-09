#!/usr/bin/env tsx
// Test script to verify analytics database writes
// Run with: npx tsx test-analytics-db.ts

import { analyticsService } from './src/lib/analytics/service';
import { analyticsDb } from './src/lib/analytics/database';
import { analyticsPool } from './src/lib/analytics/connection-pool';

async function testAnalyticsSystem() {
  console.log('🔍 Testing Analytics System...\n');

  // Test 1: Pool Health Check
  console.log('1️⃣ Testing connection pool health...');
  const poolHealth = await analyticsPool.healthCheck();
  console.log(`   Pool health: ${poolHealth ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);

  if (!poolHealth) {
    console.error('   ❌ Pool is not healthy. Check DATABASE_URL environment variable.');
    console.log('   Current DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    process.exit(1);
  }

  const poolStats = analyticsPool.getPoolStats();
  console.log('   Pool stats:', poolStats);
  console.log('');

  // Test 2: Database Health Check
  console.log('2️⃣ Testing database layer health...');
  const dbHealth = await analyticsDb.healthCheck();
  console.log(`   Database health: ${dbHealth ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`);

  // Test 3: Service Health Check
  console.log('3️⃣ Testing analytics service health...');
  const serviceHealth = await analyticsService.healthCheck();
  console.log(`   Service health: ${serviceHealth.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`   Message: ${serviceHealth.message}\n`);

  // Test 4: Session Creation
  console.log('4️⃣ Testing session creation...');
  const sessionId = await analyticsService.ensureSession(
    'Mozilla/5.0 (Test Browser)',
    '127.0.0.1'
  );
  console.log(`   Session ID: ${sessionId ? '✅ ' + sessionId.substring(0, 20) + '...' : '❌ NULL'}\n`);

  if (!sessionId) {
    console.error('   ❌ Failed to create session');
    process.exit(1);
  }

  // Test 5: Conversation Creation
  console.log('5️⃣ Testing conversation creation...');
  const conversationId = await analyticsService.startConversation(
    sessionId,
    false,
    50
  );
  console.log(`   Conversation ID: ${conversationId ? '✅ ' + conversationId.substring(0, 20) + '...' : '❌ NULL'}\n`);

  if (!conversationId) {
    console.error('   ❌ Failed to create conversation');
    process.exit(1);
  }

  // Test 6: Message Logging (fire-and-forget, so we need to wait)
  console.log('6️⃣ Testing message logging (fire-and-forget)...');
  analyticsService.logMessage(
    conversationId,
    sessionId,
    1,
    'user',
    'This is a test message from the analytics test script',
    undefined,
    'noah'
  );
  console.log('   Message logged (fire-and-forget initiated)');
  console.log('   Waiting 2 seconds for async write to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('   ✅ Wait complete\n');

  // Test 7: Tool Logging (fire-and-forget, so we need to wait)
  console.log('7️⃣ Testing tool logging (fire-and-forget)...');
  analyticsService.logGeneratedTool(
    conversationId,
    sessionId,
    undefined,
    'Test Calculator Tool',
    '<html><body><h1>Test Calculator</h1></body></html>',
    1500,
    'noah',
    100,
    'test_strategy'
  );
  console.log('   Tool logged (fire-and-forget initiated)');
  console.log('   Waiting 2 seconds for async write to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('   ✅ Wait complete\n');

  // Test 8: Direct Database Query to Verify Writes
  console.log('8️⃣ Verifying writes in database...');

  const sessionCheck = await analyticsPool.executeQuery<Array<{ id: string; session_fingerprint: string }>>(
    'SELECT id, session_fingerprint FROM user_sessions WHERE id = $1',
    [sessionId]
  );
  console.log(`   Session in DB: ${sessionCheck && sessionCheck.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (sessionCheck && sessionCheck.length > 0) {
    console.log(`   - ID: ${sessionCheck[0].id.substring(0, 20)}...`);
    console.log(`   - Fingerprint: ${sessionCheck[0].session_fingerprint.substring(0, 30)}...`);
  }

  const conversationCheck = await analyticsPool.executeQuery<Array<{ id: string; session_id: string }>>(
    'SELECT id, session_id FROM conversations WHERE id = $1',
    [conversationId]
  );
  console.log(`   Conversation in DB: ${conversationCheck && conversationCheck.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (conversationCheck && conversationCheck.length > 0) {
    console.log(`   - ID: ${conversationCheck[0].id.substring(0, 20)}...`);
    console.log(`   - Session ID: ${conversationCheck[0].session_id.substring(0, 20)}...`);
  }

  const messageCheck = await analyticsPool.executeQuery<Array<{ id: string; role: string; content: string }>>(
    'SELECT id, role, content FROM messages WHERE conversation_id = $1',
    [conversationId]
  );
  console.log(`   Messages in DB: ${messageCheck && messageCheck.length > 0 ? `✅ FOUND (${messageCheck.length})` : '❌ NOT FOUND'}`);
  if (messageCheck && messageCheck.length > 0) {
    messageCheck.forEach((msg, idx) => {
      console.log(`   - Message ${idx + 1}: ${msg.role} - "${msg.content.substring(0, 40)}..."`);
    });
  }

  const toolCheck = await analyticsPool.executeQuery<Array<{ id: string; title: string; content_length: number }>>(
    'SELECT id, title, content_length FROM generated_tools WHERE conversation_id = $1',
    [conversationId]
  );
  console.log(`   Tools in DB: ${toolCheck && toolCheck.length > 0 ? `✅ FOUND (${toolCheck.length})` : '❌ NOT FOUND'}`);
  if (toolCheck && toolCheck.length > 0) {
    toolCheck.forEach((tool, idx) => {
      console.log(`   - Tool ${idx + 1}: "${tool.title}" (${tool.content_length} bytes)`);
    });
  }

  console.log('\n✅ Analytics system test complete!');

  // Cleanup
  await analyticsPool.shutdown();
}

testAnalyticsSystem().catch((error) => {
  console.error('\n❌ Test failed with error:');
  console.error(error);
  process.exit(1);
});
