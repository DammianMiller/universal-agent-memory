import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ShortTermMemoryBackend } from './factory.js';

interface ShortTermMemory {
  id?: number;
  timestamp: string;
  type: 'action' | 'observation' | 'thought' | 'goal';
  content: string;
  projectId?: string;
}

export class SQLiteShortTermMemory implements ShortTermMemoryBackend {
  private db: Database.Database;
  private projectId: string;
  private maxEntries: number;

  constructor(config: { dbPath: string; projectId?: string; maxEntries?: number }) {
    // Ensure directory exists
    const dir = dirname(config.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(config.dbPath);
    this.projectId = config.projectId || 'default';
    this.maxEntries = config.maxEntries || 50;

    // Initialize schema
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('action', 'observation', 'thought', 'goal')),
        content TEXT NOT NULL,
        project_id TEXT NOT NULL DEFAULT 'default'
      );
      CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
    `);
  }

  async store(type: ShortTermMemory['type'], content: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO memories (timestamp, type, content, project_id)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(new Date().toISOString(), type, content, this.projectId);
    
    // Auto-prune if exceeds maxEntries
    await this.prune();
  }

  async storeBatch(
    entries: Array<{ type: ShortTermMemory['type']; content: string; timestamp?: string }>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO memories (timestamp, type, content, project_id)
      VALUES (?, ?, ?, ?)
    `);

    type EntryType = { type: ShortTermMemory['type']; content: string; timestamp?: string };
    const insertMany = this.db.transaction((items: EntryType[]) => {
      for (const entry of items) {
        stmt.run(
          entry.timestamp || new Date().toISOString(),
          entry.type,
          entry.content,
          this.projectId
        );
      }
    });

    insertMany(entries);
    await this.prune();
  }

  async getRecent(limit = 50): Promise<ShortTermMemory[]> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, type, content, project_id as projectId
      FROM memories
      WHERE project_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(this.projectId, limit) as ShortTermMemory[];
  }

  async query(searchTerm: string, limit = 10): Promise<ShortTermMemory[]> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, type, content, project_id as projectId
      FROM memories
      WHERE project_id = ? AND content LIKE ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(this.projectId, `%${searchTerm}%`, limit) as ShortTermMemory[];
  }

  async getByType(type: ShortTermMemory['type'], limit = 50): Promise<ShortTermMemory[]> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, type, content, project_id as projectId
      FROM memories
      WHERE project_id = ? AND type = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(this.projectId, type, limit) as ShortTermMemory[];
  }

  async count(): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM memories
      WHERE project_id = ?
    `);
    const result = stmt.get(this.projectId) as { count: number };
    return result.count;
  }

  private async prune(): Promise<void> {
    const count = await this.count();
    if (count > this.maxEntries) {
      const toDelete = count - this.maxEntries;
      const stmt = this.db.prepare(`
        DELETE FROM memories
        WHERE id IN (
          SELECT id FROM memories
          WHERE project_id = ?
          ORDER BY id ASC
          LIMIT ?
        )
      `);
      stmt.run(this.projectId, toDelete);
    }
  }

  async clear(): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM memories
      WHERE project_id = ?
    `);
    stmt.run(this.projectId);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // Export all memories as JSON (useful for backup/migration)
  async exportAll(): Promise<ShortTermMemory[]> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, type, content, project_id as projectId
      FROM memories
      WHERE project_id = ?
      ORDER BY id ASC
    `);
    return stmt.all(this.projectId) as ShortTermMemory[];
  }

  // Import memories from JSON (useful for restore/migration)
  async importAll(
    memories: Array<{ type: ShortTermMemory['type']; content: string; timestamp?: string }>
  ): Promise<number> {
    await this.storeBatch(memories);
    return memories.length;
  }
}
