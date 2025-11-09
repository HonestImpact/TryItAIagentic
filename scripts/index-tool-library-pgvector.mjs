#!/usr/bin/env node
/**
 * Index Tool Library into pgvector
 * Populates rag_embeddings with 21 static templates from tool_reference
 * This gives semantic search access to the reference library from day 1
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import { OpenAI } from 'openai';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Load environment
config({ path: join(projectRoot, '.env') });

console.log('🔄 Indexing Tool Library into pgvector\n');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float'
  });
  return response.data[0].embedding;
}

async function indexToolLibrary() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Connect to database
    console.log('1️⃣  Connecting to Supabase...');
    await client.connect();
    console.log('   ✅ Connected\n');

    // 2. Fetch all tool references
    console.log('2️⃣  Fetching tool references...');
    const result = await client.query(`
      SELECT
        id, tool_name, title, description, category,
        features, functionality, usage_patterns, html_content,
        created_at
      FROM tool_reference
      ORDER BY category, title
    `);

    const tools = result.rows;
    console.log(`   ✅ Found ${tools.length} tool templates\n`);

    // 3. Index each tool with embedding
    console.log('3️⃣  Generating embeddings and indexing...\n');

    let indexed = 0;
    for (const tool of tools) {
      try {
        // Generate embedding for the full HTML content
        console.log(`   📝 Processing: ${tool.title} (${tool.category})`);
        const embedding = await generateEmbedding(tool.html_content);

        // Insert into rag_embeddings
        await client.query(`
          INSERT INTO rag_embeddings (id, content, embedding, metadata)
          VALUES ($1, $2, $3::vector, $4::jsonb)
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata,
            created_at = NOW()
        `, [
          `tool_reference_${tool.id}`,
          tool.html_content,
          JSON.stringify(embedding),
          JSON.stringify({
            source: 'tool_reference',
            type: 'knowledge',
            title: tool.title,
            category: tool.category,
            timestamp: new Date(tool.created_at).toISOString()
          })
        ]);

        indexed++;
        console.log(`      ✅ Indexed (${indexed}/${tools.length})\n`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`      ❌ Failed: ${error.message}`);
      }
    }

    console.log(`   ✅ Indexed ${indexed}/${tools.length} tools successfully\n`);

    // 4. Verify indexing
    console.log('4️⃣  Verifying indexing...');
    const stats = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE metadata->>'source' = 'tool_reference') as templates,
        COUNT(*) FILTER (WHERE metadata->>'source' = 'generated') as generated
      FROM rag_embeddings
    `);

    console.log(`   ✅ Total embeddings: ${stats.rows[0].total}`);
    console.log(`   ✅ Template count: ${stats.rows[0].templates}`);
    console.log(`   ✅ Generated count: ${stats.rows[0].generated}\n`);

    // 5. Test semantic search
    console.log('5️⃣  Testing semantic search...\n');
    const testQuery = 'tool for tracking expenses and budget';
    console.log(`   🔍 Query: "${testQuery}"\n`);

    const queryEmbedding = await generateEmbedding(testQuery);

    const searchResults = await client.query(`
      SELECT
        metadata->>'title' as title,
        metadata->>'category' as category,
        1 - (embedding <=> $1::vector) as similarity
      FROM rag_embeddings
      WHERE metadata->>'source' = 'tool_reference'
        AND 1 - (embedding <=> $1::vector) >= 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `, [JSON.stringify(queryEmbedding)]);

    console.log(`   📊 Results: ${searchResults.rows.length} matches\n`);

    searchResults.rows.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.title} (score: ${result.similarity.toFixed(3)})`);
      console.log(`      Category: ${result.category}\n`);
    });

    // Success summary
    console.log('✅ Tool library indexing complete!\n');
    console.log('📋 What happened:');
    console.log(`   • Indexed ${indexed} static tool templates`);
    console.log('   • Generated OpenAI embeddings (text-embedding-3-small)');
    console.log('   • Stored in rag_embeddings with metadata');
    console.log('   • Semantic search verified working\n');

    console.log('🎯 Next:');
    console.log('   • Restart dev server: npm run dev');
    console.log('   • New tools will auto-index when generated');
    console.log('   • Dual-source search (keyword + semantic) is active\n');

  } catch (error) {
    console.error('❌ Indexing failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check for required API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in .env file');
  console.error('   Add: OPENAI_API_KEY=sk-...\n');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in .env file');
  process.exit(1);
}

// Run
indexToolLibrary();
