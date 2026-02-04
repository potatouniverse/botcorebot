/**
 * Memory API Types
 */

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  activation: number;
  created_at: string;
  last_accessed?: string;
  metadata?: Record<string, unknown>;
}

export type MemoryType = 
  | 'factual'
  | 'relational'
  | 'procedural'
  | 'episodic'
  | 'semantic';

export interface RecallRequest {
  query: string;
  limit?: number;
  types?: MemoryType[];
}

export interface RecallResponse {
  results: Memory[];
  took_ms: number;
}

export interface StoreRequest {
  content: string;
  type?: MemoryType;
  importance?: number;
  metadata?: Record<string, unknown>;
}

export interface StoreResponse {
  id: string;
  success: boolean;
}

export interface ConsolidateResponse {
  consolidated: boolean;
  stats: {
    memories_before: number;
    memories_after: number;
    merged: number;
    forgotten: number;
  };
}

export interface StatsResponse {
  total_memories: number;
  by_type: Record<MemoryType, number>;
  oldest_memory?: string;
  newest_memory?: string;
  avg_importance: number;
}

export interface User {
  id: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  tier: 'free' | 'pro' | 'enterprise';
  name?: string;
  created_at: string;
  last_used?: string;
}

export interface MemoryInstance {
  id: string;
  user_id: string;
  db_path: string;
  name?: string;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  endpoint: string;
  timestamp: string;
  tokens_used?: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

// Rate limit tiers
export const RATE_LIMITS: Record<ApiKey['tier'], number> = {
  free: 10,      // 10 req/min
  pro: 100,      // 100 req/min
  enterprise: 1000, // 1000 req/min
};
