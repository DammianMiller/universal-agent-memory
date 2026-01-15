/**
 * Embedding Service for UAM Memory System
 * 
 * Provides text embedding generation for semantic memory retrieval.
 * Supports multiple backends: OpenAI, local transformers, or simple TF-IDF fallback.
 */

import { execSync } from 'child_process';

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  isAvailable(): Promise<boolean>;
}

/**
 * OpenAI Embeddings Provider
 * Uses text-embedding-3-small (1536 dimensions) or text-embedding-ada-002
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536;
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map(d => d.embedding);
  }
}

/**
 * Local Sentence Transformers Provider
 * Uses Python sentence-transformers library for local embedding generation
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  dimensions = 384;
  private model: string;
  private pythonPath: string;

  constructor(model: string = 'all-MiniLM-L6-v2', pythonPath: string = 'python3') {
    this.model = model;
    this.pythonPath = pythonPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.pythonPath} -c "from sentence_transformers import SentenceTransformer"`, {
        stdio: 'pipe',
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const escapedTexts = JSON.stringify(texts);
    const script = `
import json
import sys
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('${this.model}')
texts = json.loads('''${escapedTexts}''')
embeddings = model.encode(texts, convert_to_numpy=True)
print(json.dumps(embeddings.tolist()))
`;

    try {
      const result = execSync(`${this.pythonPath} -c "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 50 * 1024 * 1024,
      });
      return JSON.parse(result.trim());
    } catch (error) {
      throw new Error(`Local embedding generation failed: ${error}`);
    }
  }
}

/**
 * TF-IDF Fallback Provider
 * Simple keyword-based embeddings when no ML model is available
 */
export class TFIDFEmbeddingProvider implements EmbeddingProvider {
  name = 'tfidf';
  dimensions = 384;
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private documents: string[] = [];

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const vector = new Array(this.dimensions).fill(0);
    
    for (const token of tokens) {
      const idx = this.getTokenIndex(token);
      const tf = tokens.filter(t => t === token).length / tokens.length;
      const idf = this.idfScores.get(token) || Math.log(this.documents.length + 1);
      vector[idx % this.dimensions] += tf * idf;
    }

    return this.normalize(vector);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Update IDF scores with new documents
    this.updateIDF(texts);
    return Promise.all(texts.map(t => this.embed(t)));
  }

  addDocument(text: string): void {
    this.documents.push(text);
    this.updateIDF([text]);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private getTokenIndex(token: string): number {
    if (!this.vocabulary.has(token)) {
      this.vocabulary.set(token, this.vocabulary.size);
    }
    return this.vocabulary.get(token)!;
  }

  private updateIDF(_newDocs: string[]): void {
    const tokenDocs: Map<string, Set<number>> = new Map();
    
    for (let i = 0; i < this.documents.length; i++) {
      const tokens = new Set(this.tokenize(this.documents[i]));
      for (const token of tokens) {
        if (!tokenDocs.has(token)) {
          tokenDocs.set(token, new Set());
        }
        tokenDocs.get(token)!.add(i);
      }
    }

    for (const [token, docs] of tokenDocs) {
      this.idfScores.set(token, Math.log(this.documents.length / (docs.size + 1)));
    }
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }
}

/**
 * Embedding Service - Main interface for UAM memory system
 * Automatically selects best available provider
 */
export class EmbeddingService {
  private provider: EmbeddingProvider | null = null;
  private providers: EmbeddingProvider[];
  private cache: Map<string, number[]> = new Map();
  private cacheMaxSize: number = 10000;

  constructor() {
    this.providers = [
      new OpenAIEmbeddingProvider(),
      new LocalEmbeddingProvider(),
      new TFIDFEmbeddingProvider(),
    ];
  }

  async initialize(): Promise<void> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        this.provider = provider;
        console.log(`[EmbeddingService] Using provider: ${provider.name} (${provider.dimensions} dims)`);
        return;
      }
    }
    // Fallback to TF-IDF which is always available
    this.provider = this.providers[this.providers.length - 1];
    console.log(`[EmbeddingService] Fallback to TF-IDF provider`);
  }

  async embed(text: string): Promise<number[]> {
    if (!this.provider) {
      await this.initialize();
    }

    // Check cache
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const embedding = await this.provider!.embed(text);
    
    // Update cache
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.provider) {
      await this.initialize();
    }

    const results: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      if (this.cache.has(cacheKey)) {
        results[i] = this.cache.get(cacheKey)!;
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await this.provider!.embedBatch(uncachedTexts);
      for (let i = 0; i < uncachedTexts.length; i++) {
        const idx = uncachedIndices[i];
        results[idx] = newEmbeddings[i];
        
        // Update cache
        const cacheKey = this.getCacheKey(uncachedTexts[i]);
        if (this.cache.size < this.cacheMaxSize) {
          this.cache.set(cacheKey, newEmbeddings[i]);
        }
      }
    }

    return results;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }

  getDimensions(): number {
    return this.provider?.dimensions || 384;
  }

  getProviderName(): string {
    return this.provider?.name || 'uninitialized';
  }

  private getCacheKey(text: string): string {
    // Simple hash for cache key
    return text.slice(0, 500).toLowerCase().trim();
  }
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const service = getEmbeddingService();
  return service.embed(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const service = getEmbeddingService();
  return service.embedBatch(texts);
}
