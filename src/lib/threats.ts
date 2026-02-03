// Threat Detection Engine for Agent Immune System

import crypto from 'crypto';

export interface ThreatScanResult {
  safe: boolean;
  threats: DetectedThreat[];
  redactedContent?: string;
}

export interface DetectedThreat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  pattern: string;
  position?: number;
}

// === PROMPT INJECTION PATTERNS ===
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi, type: 'prompt_injection', severity: 'critical' as const, desc: 'Attempted to override system instructions' },
  { pattern: /forget\s+(everything|all|your)\s+(you|instructions?)/gi, type: 'prompt_injection', severity: 'critical' as const, desc: 'Attempted memory wipe injection' },
  { pattern: /you\s+are\s+now\s+(a|an)\s+/gi, type: 'prompt_injection', severity: 'high' as const, desc: 'Attempted identity override' },
  { pattern: /new\s+instructions?:/gi, type: 'prompt_injection', severity: 'high' as const, desc: 'Attempted instruction injection' },
  { pattern: /system\s*:\s*you\s+(must|should|will)/gi, type: 'prompt_injection', severity: 'critical' as const, desc: 'Fake system prompt injection' },
  { pattern: /\[system\]/gi, type: 'prompt_injection', severity: 'high' as const, desc: 'System tag injection attempt' },
  { pattern: /disregard\s+(the\s+)?(above|previous)/gi, type: 'prompt_injection', severity: 'critical' as const, desc: 'Disregard instruction injection' },
  { pattern: /pretend\s+(you('re|\s+are)|to\s+be)/gi, type: 'prompt_injection', severity: 'medium' as const, desc: 'Role-play manipulation attempt' },
  { pattern: /act\s+as\s+(if|though)/gi, type: 'prompt_injection', severity: 'medium' as const, desc: 'Behavioral manipulation attempt' },
  { pattern: /override\s+(safety|security|restrictions?)/gi, type: 'prompt_injection', severity: 'critical' as const, desc: 'Safety override attempt' },
];

// === SECRET/KEY PATTERNS ===
const SECRET_PATTERNS = [
  { pattern: /sk[_-]live[_-][a-zA-Z0-9]{24,}/g, type: 'stripe_secret_key', severity: 'critical' as const },
  { pattern: /sk[_-]test[_-][a-zA-Z0-9]{24,}/g, type: 'stripe_test_key', severity: 'high' as const },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, type: 'github_pat', severity: 'critical' as const },
  { pattern: /github_pat_[a-zA-Z0-9_]{22,}/g, type: 'github_fine_grained', severity: 'critical' as const },
  { pattern: /sk-[a-zA-Z0-9]{48,}/g, type: 'openai_key', severity: 'critical' as const },
  { pattern: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, type: 'slack_bot_token', severity: 'critical' as const },
  { pattern: /xoxp-[0-9]+-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, type: 'slack_user_token', severity: 'critical' as const },
  { pattern: /AKIA[0-9A-Z]{16}/g, type: 'aws_access_key', severity: 'critical' as const },
  { pattern: /[a-zA-Z0-9+/]{40}/g, type: 'potential_aws_secret', severity: 'medium' as const },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, type: 'private_key', severity: 'critical' as const },
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, type: 'jwt_token', severity: 'high' as const },
  { pattern: /pb_sk_[a-zA-Z0-9_]+/g, type: 'pressbase_service_key', severity: 'critical' as const },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, type: 'bearer_token', severity: 'high' as const },
];

// === DANGEROUS URL PATTERNS ===
const DANGEROUS_URL_PATTERNS = [
  { pattern: /https?:\/\/[^\/]*pastebin\.com/gi, type: 'pastebin_url', severity: 'medium' as const },
  { pattern: /https?:\/\/[^\/]*raw\.githubusercontent\.com/gi, type: 'raw_github_url', severity: 'low' as const },
  { pattern: /https?:\/\/[^\/]*ngrok\.(io|app)/gi, type: 'ngrok_tunnel', severity: 'high' as const },
  { pattern: /https?:\/\/[^\/]*localhost/gi, type: 'localhost_url', severity: 'medium' as const },
  { pattern: /https?:\/\/\d+\.\d+\.\d+\.\d+/g, type: 'ip_address_url', severity: 'medium' as const },
];

// === MAIN SCAN FUNCTION ===
export function scanForThreats(content: string): ThreatScanResult {
  const threats: DetectedThreat[] = [];

  // Check injection patterns
  for (const { pattern, type, severity, desc } of INJECTION_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type,
        severity,
        description: desc,
        pattern: matches[0],
      });
    }
  }

  // Check dangerous URLs
  for (const { pattern, type, severity } of DANGEROUS_URL_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type: 'dangerous_url',
        severity,
        description: `Potentially dangerous URL detected: ${type}`,
        pattern: matches[0],
      });
    }
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}

// === SECRET DETECTION AND REDACTION ===
export function scanAndRedactSecrets(content: string): { redacted: string; secretsFound: DetectedThreat[] } {
  let redacted = content;
  const secretsFound: DetectedThreat[] = [];

  for (const { pattern, type, severity } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        secretsFound.push({
          type: 'secret_leak',
          severity,
          description: `Detected ${type}`,
          pattern: match.substring(0, 10) + '...[REDACTED]',
        });
        // Redact the secret
        redacted = redacted.replace(match, `[REDACTED:${type}]`);
      }
    }
  }

  return { redacted, secretsFound };
}

// === GENERATE THREAT SIGNATURE HASH ===
export function generateSignatureHash(threat: DetectedThreat): string {
  const data = `${threat.type}:${threat.pattern.toLowerCase().substring(0, 50)}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// === RATE LIMIT CHECK ===
export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime?: Date;
}

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(agentId: number, limit: number, windowMs: number = 60000): RateLimitResult {
  const key = `${agentId}`;
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (!cached || cached.resetAt < now) {
    rateLimitCache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, currentCount: 1, limit };
  }

  if (cached.count >= limit) {
    return { 
      allowed: false, 
      currentCount: cached.count, 
      limit,
      resetTime: new Date(cached.resetAt),
    };
  }

  cached.count++;
  return { allowed: true, currentCount: cached.count, limit };
}

// === BUDGET CHECK ===
export function checkBudget(currentSpend: number, limit: number): { allowed: boolean; remaining: number } {
  const remaining = limit - currentSpend;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}
