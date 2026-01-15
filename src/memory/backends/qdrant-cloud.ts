import { QdrantClient } from '@qdrant/js-client-rest';
import type { MemoryBackend, MemoryEntry } from './base.js';
import { getEmbeddingService } from '../embeddings.js';

interface QdrantCloudBackendConfig {
  url: string;
  apiKey: string;
  collection: string;
}

export class QdrantCloudBackend implements MemoryBackend {
  private client: QdrantClient;
  private collection: string;

  constructor(config: QdrantCloudBackendConfig) {
    const apiKey = config.apiKey || process.env.QDRANT_API_KEY;
    const url = config.url || process.env.QDRANT_URL;
    
    if (!url || !apiKey) {
      throw new Error('Qdrant Cloud URL and API key required (QDRANT_URL and QDRANT_API_KEY env vars or config)');
    }

    this.client = new QdrantClient({ url, apiKey });
    this.collection = config.collection;
  }

  async isConfigured(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  async store(entry: MemoryEntry): Promise<void> {
    if (!entry.embedding) {
      throw new Error('Embedding required for Qdrant storage');
    }

    await this.ensureCollection();
    await this.client.upsert(this.collection, {
      points: [
        {
          id: entry.id,
          vector: entry.embedding,
          payload: {
            timestamp: entry.timestamp,
            type: entry.type,
            content: entry.content,
            tags: entry.tags,
            importance: entry.importance,
            ...entry.metadata,
          },
        },
      ],
    });
  }

  async query(queryText: string, limit = 10): Promise<MemoryEntry[]> {
    // Generate real embedding for semantic search
    const embeddingService = getEmbeddingService();
    const queryEmbedding = await embeddingService.embed(queryText);
    
    const results = await this.client.search(this.collection, {
      vector: queryEmbedding,
      limit,
      score_threshold: 0.5, // Only return relevant results
    });

    return results.map((r) => ({
      id: String(r.id),
      timestamp: r.payload?.timestamp as string,
      type: r.payload?.type as 'action' | 'observation' | 'thought' | 'goal',
      content: r.payload?.content as string,
      embedding: r.vector as number[],
      tags: r.payload?.tags as string[],
      importance: r.payload?.importance as number,
      metadata: r.payload as Record<string, unknown>,
    }));
  }

  async getRecent(limit = 50): Promise<MemoryEntry[]> {
    const results = await this.client.scroll(this.collection, {
      limit,
      with_payload: true,
      with_vector: false,
    });

    return results.points.map((r) => ({
      id: String(r.id),
      timestamp: r.payload?.timestamp as string,
      type: r.payload?.type as 'action' | 'observation' | 'thought' | 'goal',
      content: r.payload?.content as string,
      tags: r.payload?.tags as string[],
      importance: r.payload?.importance as number,
      metadata: r.payload as Record<string, unknown>,
    }));
  }

  async prune(olderThan: Date): Promise<number> {
    const results = await this.client.scroll(this.collection, {
      filter: {
        must: [
          {
            key: 'timestamp',
            range: {
              lt: olderThan.toISOString(),
            },
          },
        ],
      },
      limit: 1000,
      with_payload: false,
    });

    const ids = results.points.map((p) => p.id);
    if (ids.length > 0) {
      await this.client.delete(this.collection, { points: ids });
    }
    return ids.length;
  }

  private async ensureCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collection);
    
    if (!exists) {
      await this.client.createCollection(this.collection, {
        vectors: { size: 384, distance: 'Cosine' },
      });
    }
  }
}
