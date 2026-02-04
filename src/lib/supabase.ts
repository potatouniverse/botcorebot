import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ApiKey, MemoryInstance, UsageLog } from './types';

// Server-side Supabase client (use service key for admin operations)
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

// Validate API key and return user info
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  user?: { id: string; tier: ApiKey['tier'] };
  error?: string;
}> {
  // For development/testing
  if (process.env.TEST_API_KEY && apiKey === process.env.TEST_API_KEY) {
    return {
      valid: true,
      user: { id: 'test-user', tier: 'pro' }
    };
  }
  
  const supabase = getSupabaseAdmin();
  
  // Hash the key for lookup (keys are stored hashed)
  const keyHash = await hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, tier, last_used')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Update last_used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', data.id);
  
  return {
    valid: true,
    user: { id: data.user_id, tier: data.tier }
  };
}

// Get or create memory instance for user
export async function getMemoryInstance(userId: string): Promise<MemoryInstance | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('memory_instances')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching memory instance:', error);
    return null;
  }
  
  if (data) {
    return data as MemoryInstance;
  }
  
  // Create new instance for user
  const newInstance = {
    user_id: userId,
    db_path: `memory/${userId}/engram.db`,
    name: 'default',
    created_at: new Date().toISOString()
  };
  
  const { data: created, error: createError } = await supabase
    .from('memory_instances')
    .insert(newInstance)
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating memory instance:', createError);
    return null;
  }
  
  return created as MemoryInstance;
}

// Log API usage
export async function logUsage(
  userId: string,
  endpoint: string,
  tokensUsed?: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const log: Partial<UsageLog> = {
    user_id: userId,
    endpoint,
    timestamp: new Date().toISOString(),
    tokens_used: tokensUsed
  };
  
  await supabase.from('usage_log').insert(log);
}

// Check usage quota
export async function checkQuota(
  userId: string,
  tier: ApiKey['tier']
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = getSupabaseAdmin();
  
  // Get usage in current minute for rate limiting
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { count, error } = await supabase
    .from('usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('timestamp', oneMinuteAgo);
  
  if (error) {
    console.error('Error checking quota:', error);
    return { allowed: true, remaining: 0 }; // Fail open
  }
  
  const limit = {
    free: parseInt(process.env.RATE_LIMIT_FREE || '10'),
    pro: parseInt(process.env.RATE_LIMIT_PRO || '100'),
    enterprise: 1000
  }[tier];
  
  const used = count || 0;
  const remaining = Math.max(0, limit - used);
  
  return {
    allowed: used < limit,
    remaining
  };
}

// Hash API key for storage/lookup
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate new API key
export async function generateApiKey(
  userId: string,
  tier: ApiKey['tier'],
  name?: string
): Promise<{ key: string; id: string }> {
  const supabase = getSupabaseAdmin();
  
  // Generate a secure random key
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const key = `bcb_${Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  
  const keyHash = await hashApiKey(key);
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      tier,
      name,
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
  
  return { key, id: data.id };
}
