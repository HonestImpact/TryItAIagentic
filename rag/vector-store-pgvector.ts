/**
 * pgvector Vector Store - Serverless-Native RAG
 *
 * WHY PGVECTOR:
 * - Scale-to-zero compatible (no cold-start penalty)
 * - Persistent across container sleeps (in PostgreSQL)
 * - Fast similarity search (<100ms with ivfflat index)
 * - Same database as analytics (one less service)
 * - Enables hybrid search (semantic + keyword)
 *
 * Replaces ChromaDB for production deployment while maintaining same API.
 */

import { createLogger } from '@/lib/logger';
import { analyticsPool } from '@/lib/analytics/connection-pool';
import type { DocumentChunk, SearchResult } from './vector-store';
import { embeddingService } from './embeddings';

const logger = createLogger('pgvector-store');

export class PgVectorStore {
  private initialized = false;

  /**
   * Initialize pgvector (verify extension is enabled)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🔗 Initializing pgvector...');

      // Verify pgvector extension exists
      const result = await analyticsPool.executeQuery<Array<{ installed: boolean }>>(
        `SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as installed`,
        [],
        { skipOnError: false }
      );

      if (!result || !result[0]?.installed) {
        throw new Error('pgvector extension not installed. Run migration 004_add_pgvector_rag.sql');
      }

      this.initialized = true;
      logger.info('✅ pgvector initialized successfully');

    } catch (error) {
      logger.error('💥 Failed to initialize pgvector', { error });
      throw new Error(`pgvector initialization failed: ${error}`);
    }
  }

  /**
   * Add documents to the vector store with embeddings
   */
  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    await this.initialize();

    try {
      logger.info('📝 Adding documents to pgvector', { count: documents.length });

      for (const doc of documents) {
        // Generate embedding if not provided
        const embedding = doc.embedding ||
          (await embeddingService.generateEmbedding(doc.content)).embedding;

        // Insert/update document with embedding
        await analyticsPool.executeQuery(
          `INSERT INTO rag_embeddings (id, content, embedding, metadata)
           VALUES ($1, $2, $3::vector, $4::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             created_at = NOW()`,
          [
            doc.id,
            doc.content,
            JSON.stringify(embedding), // pgvector accepts JSON array as vector
            JSON.stringify(doc.metadata)
          ],
          { skipOnError: true }
        );
      }

      logger.info('✅ Documents added successfully', { count: documents.length });

    } catch (error) {
      logger.error('💥 Failed to add documents', { error, count: documents.length });
      throw error;
    }
  }

  /**
   * Semantic search using vector similarity
   */
  async search(query: string, options: {
    maxResults?: number;
    minRelevanceScore?: number;
    filter?: Record<string, unknown>;
  } = {}): Promise<SearchResult[]> {
    await this.initialize();

    const {
      maxResults = 5,
      minRelevanceScore = 0.7,
      filter = {}
    } = options;

    try {
      logger.info('🔍 pgvector semantic search', {
        query: query.substring(0, 100),
        maxResults,
        minRelevanceScore
      });

      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Build WHERE clause for metadata filtering
      const whereClauses: string[] = [];
      const params: any[] = [JSON.stringify(queryEmbedding.embedding), minRelevanceScore, maxResults];
      let paramIndex = 4;

      for (const [key, value] of Object.entries(filter)) {
        whereClauses.push(`metadata->>'${key}' = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0
        ? `AND ${whereClauses.join(' AND ')}`
        : '';

      // Semantic similarity search using cosine distance
      const results = await analyticsPool.executeQuery<Array<{
        id: string;
        content: string;
        metadata: any;
        similarity: number;
      }>>(
        `SELECT
          id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
         FROM rag_embeddings
         WHERE 1 - (embedding <=> $1::vector) >= $2
         ${whereClause}
         ORDER BY similarity DESC
         LIMIT $3`,
        params,
        { skipOnError: false }
      );

      if (!results || results.length === 0) {
        logger.info('No semantic matches found', { query: query.substring(0, 100) });
        return [];
      }

      const searchResults: SearchResult[] = results.map(row => ({
        id: row.id,
        content: row.content,
        score: row.similarity,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      logger.info('✅ Semantic search completed', {
        resultsFound: searchResults.length,
        topScore: searchResults[0]?.score.toFixed(2)
      });

      return searchResults;

    } catch (error) {
      logger.error('💥 Semantic search failed', { error, query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Hybrid search: Semantic similarity + Keyword matching
   * Best of both worlds - understands meaning AND finds exact terms
   */
  async hybridSearch(query: string, options: {
    maxResults?: number;
    minRelevanceScore?: number;
    semanticWeight?: number; // 0-1, default 0.7
  } = {}): Promise<SearchResult[]> {
    await this.initialize();

    const {
      maxResults = 5,
      minRelevanceScore = 0.5,
      semanticWeight = 0.7
    } = options;

    const keywordWeight = 1 - semanticWeight;

    try {
      logger.info('🔮 pgvector hybrid search', {
        query: query.substring(0, 100),
        semanticWeight,
        keywordWeight
      });

      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Hybrid search: weighted combination of semantic + keyword
      const results = await analyticsPool.executeQuery<Array<{
        id: string;
        content: string;
        metadata: any;
        combined_score: number;
        semantic_score: number;
        keyword_score: number;
      }>>(
        `SELECT
          id,
          content,
          metadata,
          (1 - (embedding <=> $1::vector)) * $4 +
            COALESCE(ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)), 0) * $5
            AS combined_score,
          (1 - (embedding <=> $1::vector)) as semantic_score,
          COALESCE(ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)), 0) as keyword_score
         FROM rag_embeddings
         WHERE
           (1 - (embedding <=> $1::vector)) >= $3
           OR to_tsvector('english', content) @@ plainto_tsquery('english', $2)
         ORDER BY combined_score DESC
         LIMIT $6`,
        [
          JSON.stringify(queryEmbedding.embedding),
          query,
          minRelevanceScore,
          semanticWeight,
          keywordWeight,
          maxResults
        ],
        { skipOnError: false }
      );

      if (!results || results.length === 0) {
        logger.info('No hybrid matches found', { query: query.substring(0, 100) });
        return [];
      }

      const searchResults: SearchResult[] = results.map(row => ({
        id: row.id,
        content: row.content,
        score: row.combined_score,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      logger.info('✅ Hybrid search completed', {
        resultsFound: searchResults.length,
        topScore: searchResults[0]?.score.toFixed(2)
      });

      return searchResults;

    } catch (error) {
      logger.error('💥 Hybrid search failed', { error, query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Update existing document
   */
  async updateDocument(id: string, content: string, metadata: DocumentChunk['metadata']): Promise<void> {
    await this.initialize();

    try {
      const embedding = await embeddingService.generateEmbedding(content);

      await analyticsPool.executeQuery(
        `UPDATE rag_embeddings
         SET content = $1, embedding = $2::vector, metadata = $3::jsonb, created_at = NOW()
         WHERE id = $4`,
        [content, JSON.stringify(embedding.embedding), JSON.stringify(metadata), id],
        { skipOnError: false }
      );

      logger.info('✅ Document updated', { id });

    } catch (error) {
      logger.error('💥 Failed to update document', { error, id });
      throw error;
    }
  }

  /**
   * Delete documents by ID
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.initialize();

    try {
      await analyticsPool.executeQuery(
        `DELETE FROM rag_embeddings WHERE id = ANY($1::text[])`,
        [ids],
        { skipOnError: false }
      );

      logger.info('✅ Documents deleted', { count: ids.length });

    } catch (error) {
      logger.error('💥 Failed to delete documents', { error, count: ids.length });
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{ count: number; name: string }> {
    await this.initialize();

    try {
      const result = await analyticsPool.executeQuery<Array<{ count: number }>>(
        'SELECT COUNT(*)::int as count FROM rag_embeddings',
        [],
        { skipOnError: false }
      );

      return {
        count: result?.[0]?.count || 0,
        name: 'pgvector-rag-embeddings'
      };
    } catch (error) {
      logger.error('💥 Failed to get stats', { error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      const stats = await this.getStats();
      return stats.count >= 0; // Any non-error count means healthy
    } catch (error) {
      logger.error('💥 pgvector health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const pgVectorStore = new PgVectorStore();
