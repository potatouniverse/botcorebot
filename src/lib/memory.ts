/**
 * Memory Service - Per-user Engram-like memory with SQLite
 * 
 * This service manages per-user memory instances using SQLite.
 * In production, DBs are stored in persistent storage.
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import type {
  Memory,
  MemoryType,
  RecallResponse,
  StoreResponse,
  ConsolidateResponse,
  StatsResponse
} from './types';

interface MemoryRow {
  id: string;
  content: string;
  type: string;
  importance: number;
  activation: number;
  created_at: string;
  last_accessed: string | null;
  metadata: string | null;
}

// Get storage path for user's memory DB
function getDbPath(userId: string): string {
  const basePath = process.env.MEMORY_STORAGE_PATH || '/tmp/botcorebot-memory';
  return path.join(basePath, userId, 'engram.db');
}

// Ensure directory exists
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDb(userId: string): Database.Database {
  const dbPath = getDbPath(userId);
  ensureDir(dbPath);
  
  const db = new Database(dbPath);
  
  // Initialize schema if needed
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'factual',
      importance REAL DEFAULT 0.5,
      activation REAL DEFAULT 1.0,
      created_at TEXT NOT NULL,
      last_accessed TEXT,
      metadata TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_activation ON memories(activation DESC);
  `);
  
  // Try to create FTS table (might already exist)
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        content='memories',
        content_rowid='rowid'
      );
    `);
  } catch {
    // FTS table might already exist or have different config
  }
  
  // Create triggers for FTS sync (ignore if exists)
  try {
    db.exec(`
      CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
      END;
    `);
  } catch {
    // Trigger exists
  }
  
  try {
    db.exec(`
      CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      END;
    `);
  } catch {
    // Trigger exists
  }
  
  return db;
}

// Memory Service class
export class MemoryService {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async recall(
    query: string,
    limit: number = 10,
    types?: MemoryType[]
  ): Promise<RecallResponse> {
    const startTime = Date.now();
    const db = getDb(this.userId);
    
    try {
      // Check if FTS table has content
      const ftsCount = db.prepare('SELECT COUNT(*) as c FROM memories_fts').get() as { c: number };
      
      let rows: MemoryRow[];
      
      if (ftsCount.c > 0) {
        // Full-text search with type filtering
        let sql = `
          SELECT m.* 
          FROM memories m
          JOIN memories_fts fts ON m.rowid = fts.rowid
          WHERE memories_fts MATCH ?
        `;
        const params: (string | number)[] = [query];
        
        if (types && types.length > 0) {
          sql += ` AND m.type IN (${types.map(() => '?').join(',')})`;
          params.push(...types);
        }
        
        sql += ` ORDER BY m.activation DESC LIMIT ?`;
        params.push(limit);
        
        rows = db.prepare(sql).all(...params) as MemoryRow[];
      } else {
        // Fallback: LIKE search if FTS is empty
        let sql = `SELECT * FROM memories WHERE content LIKE ?`;
        const params: (string | number)[] = [`%${query}%`];
        
        if (types && types.length > 0) {
          sql += ` AND type IN (${types.map(() => '?').join(',')})`;
          params.push(...types);
        }
        
        sql += ` ORDER BY activation DESC LIMIT ?`;
        params.push(limit);
        
        rows = db.prepare(sql).all(...params) as MemoryRow[];
      }
      
      // Update last_accessed for recalled memories
      const updateStmt = db.prepare(`
        UPDATE memories SET last_accessed = ?, activation = MIN(activation * 1.1, 1.0)
        WHERE id = ?
      `);
      
      const now = new Date().toISOString();
      for (const row of rows) {
        updateStmt.run(now, row.id);
      }
      
      const results: Memory[] = rows.map(row => ({
        id: row.id,
        content: row.content,
        type: row.type as MemoryType,
        importance: row.importance,
        activation: row.activation,
        created_at: row.created_at,
        last_accessed: row.last_accessed || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
      
      return {
        results,
        took_ms: Date.now() - startTime
      };
    } finally {
      db.close();
    }
  }
  
  async store(
    content: string,
    type: MemoryType = 'factual',
    importance: number = 0.5,
    metadata?: Record<string, unknown>
  ): Promise<StoreResponse> {
    const db = getDb(this.userId);
    
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO memories (id, content, type, importance, activation, created_at, metadata)
        VALUES (?, ?, ?, ?, 1.0, ?, ?)
      `).run(
        id,
        content,
        type,
        importance,
        now,
        metadata ? JSON.stringify(metadata) : null
      );
      
      // Manually insert into FTS if trigger didn't work
      try {
        const row = db.prepare('SELECT rowid FROM memories WHERE id = ?').get(id) as { rowid: number };
        db.prepare('INSERT OR IGNORE INTO memories_fts(rowid, content) VALUES (?, ?)').run(row.rowid, content);
      } catch {
        // FTS insert failed, not critical
      }
      
      return { id, success: true };
    } finally {
      db.close();
    }
  }
  
  async consolidate(): Promise<ConsolidateResponse> {
    const db = getDb(this.userId);
    
    try {
      // Get memory count before
      const beforeCount = (db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }).count;
      
      // Apply time-based activation decay
      db.prepare(`
        UPDATE memories 
        SET activation = activation * 0.95
        WHERE activation > 0.01
      `).run();
      
      // Forget very low activation memories (threshold: 0.01)
      const forgotten = db.prepare(`
        DELETE FROM memories WHERE activation < 0.01
      `).run();
      
      // Get memory count after
      const afterCount = (db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }).count;
      
      return {
        consolidated: true,
        stats: {
          memories_before: beforeCount,
          memories_after: afterCount,
          merged: 0, // Merging not implemented yet
          forgotten: forgotten.changes
        }
      };
    } finally {
      db.close();
    }
  }
  
  async stats(): Promise<StatsResponse> {
    const db = getDb(this.userId);
    
    try {
      const total = (db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }).count;
      
      const byTypeRows = db.prepare(`
        SELECT type, COUNT(*) as count FROM memories GROUP BY type
      `).all() as { type: string; count: number }[];
      
      const byType: Record<MemoryType, number> = {
        factual: 0,
        relational: 0,
        procedural: 0,
        episodic: 0,
        semantic: 0
      };
      
      for (const row of byTypeRows) {
        byType[row.type as MemoryType] = row.count;
      }
      
      const oldest = db.prepare('SELECT MIN(created_at) as date FROM memories').get() as { date: string | null };
      const newest = db.prepare('SELECT MAX(created_at) as date FROM memories').get() as { date: string | null };
      const avgImportance = db.prepare('SELECT AVG(importance) as avg FROM memories').get() as { avg: number | null };
      
      return {
        total_memories: total,
        by_type: byType,
        oldest_memory: oldest.date || undefined,
        newest_memory: newest.date || undefined,
        avg_importance: avgImportance.avg || 0
      };
    } finally {
      db.close();
    }
  }
}

// Factory function
export function getMemoryService(userId: string): MemoryService {
  return new MemoryService(userId);
}
