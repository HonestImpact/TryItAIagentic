/**
 * RAG System with pgvector - Serverless-Native Architecture
 * Replaces ChromaDB for scale-to-zero compatibility
 */

// Core RAG components (pgvector backend)
export { pgVectorStore as vectorStore } from './vector-store-pgvector';
export { embeddingService } from './embeddings';
export { documentProcessor } from './document-processor';

// Import for internal use
import { pgVectorStore } from './vector-store-pgvector';
import { embeddingService } from './embeddings';
import { documentProcessor } from './document-processor';

// Types
export type {
  DocumentChunk,
  SearchResult
} from './vector-store';

export type {
  EmbeddingResult
} from './embeddings';

/**
 * RAG System Manager - pgvector Edition
 * Optimized for serverless/scale-to-zero deployment
 */
class RAGSystemPgVector {
  private initialized = false;

  /**
   * Initialize the RAG system (pgvector)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize pgvector store
      await pgVectorStore.initialize();

      // Test embeddings service
      await embeddingService.healthCheck();

      this.initialized = true;
      console.log('✅ RAG System (pgvector) initialized successfully');
      console.log('   • Scale-to-zero ready');
      console.log('   • No cold-start penalty');
      console.log('   • Persistent across sleeps');

    } catch (error) {
      console.error('💥 RAG System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add documents to the RAG system
   */
  async addDocuments(documents: Array<{
    id: string;
    content: string;
    metadata: {
      source: string;
      type: 'knowledge' | 'artifact' | 'conversation';
      title?: string;
      category?: string;
      timestamp: string;
    };
  }>): Promise<void> {
    await this.initialize();
    await documentProcessor.processDocuments(documents);
  }

  /**
   * Search the knowledge base (semantic)
   */
  async search(query: string, options?: {
    maxResults?: number;
    minRelevanceScore?: number;
    filter?: Record<string, unknown>;
  }) {
    await this.initialize();
    return await pgVectorStore.search(query, options);
  }

  /**
   * Hybrid search (semantic + keyword)
   * Best of both worlds for scale-to-zero
   */
  async hybridSearch(query: string, options?: {
    maxResults?: number;
    minRelevanceScore?: number;
    semanticWeight?: number;
  }) {
    await this.initialize();
    return await pgVectorStore.hybridSearch(query, options);
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<{
    vectorStore: boolean;
    embeddings: boolean;
    documentCount: number;
  }> {
    const vectorStoreHealth = await pgVectorStore.healthCheck();
    const embeddingsHealth = await embeddingService.healthCheck();
    const stats = await pgVectorStore.getStats();

    return {
      vectorStore: vectorStoreHealth,
      embeddings: embeddingsHealth,
      documentCount: stats.count
    };
  }

  /**
   * Reset the RAG system (for development/testing)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting RAG system...');
    this.initialized = false;
    await this.initialize();
  }
}

// Export singleton RAG system manager
export const ragSystem = new RAGSystemPgVector();
