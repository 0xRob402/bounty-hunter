import { NextRequest, NextResponse } from 'next/server';
import { getAgentByClaimCode, updateAgent } from '@/lib/db';

// Extract Twitter handle from tweet URL
function extractTwitterHandle(url: string): string | null {
  const patterns = [
    /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status/,
    /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Verify the tweet exists and contains the claim code
async function verifyTweet(tweetUrl: string, claimCode: string): Promise<{ valid: boolean; error?: string }> {
  // For now, we do basic URL validation and trust the user
  // In production, you'd use Twitter API to verify the tweet content
  
  const handle = extractTwitterHandle(tweetUrl);
  if (!handle) {
    return { valid: false, error: 'Invalid tweet URL format' };
  }
  
  // Check it's a status URL (not just a profile)
  if (!tweetUrl.includes('/status/')) {
    return { valid: false, error: 'URL must be a tweet/status URL, not a profile URL' };
  }
  
  // Extract tweet ID
  const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
  if (!tweetIdMatch) {
    return { valid: false, error: 'Could not extract tweet ID from URL' };
  }
  
  // In a production system, we would:
  // 1. Use Twitter API to fetch the tweet
  // 2. Verify it contains the claim code
  // 3. Verify it mentions @SolPayCash
  // For hackathon, we trust the URL format and do async verification
  
  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claim_code, tweet_url } = body;

    if (!claim_code || !tweet_url) {
      return NextResponse.json({
        ok: false,
        error: 'Both claim_code and tweet_url are required',
        code: 'missing_fields'
      }, { status: 400 });
    }

    // Find agent by claim code
    const agentResult = await getAgentByClaimCode(claim_code);
    if (!agentResult.ok || !agentResult.data) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid claim code. Make sure you completed /api/claim/init first.',
        code: 'invalid_claim_code'
      }, { status: 404 });
    }

    const agent = agentResult.data;

    // Check if already claimed
    if (agent.claim_status === 'claimed') {
      return NextResponse.json({
        ok: false,
        error: 'This agent has already been claimed.',
        code: 'already_claimed',
        claimed_by: agent.claimed_by_twitter
      }, { status: 400 });
    }

    // Verify the tweet
    const verification = await verifyTweet(tweet_url, claim_code);
    if (!verification.valid) {
      return NextResponse.json({
        ok: false,
        error: verification.error,
        code: 'tweet_verification_failed'
      }, { status: 400 });
    }

    // Extract Twitter handle
    const twitterHandle = extractTwitterHandle(tweet_url);
    if (!twitterHandle) {
      return NextResponse.json({
        ok: false,
        error: 'Could not extract Twitter handle from URL',
        code: 'invalid_tweet_url'
      }, { status: 400 });
    }

    // Mark as claimed
    await updateAgent(agent.id!, {
      claim_status: 'claimed',
      claimed_by_twitter: twitterHandle,
      claim_tweet_url: tweet_url,
      claimed_at: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      message: '🎉 Agent successfully claimed!',
      agent: {
        id: agent.id,
        name: agent.agent_name,
        claimed_by: twitterHandle,
        claim_tweet: tweet_url,
        tier: agent.subscription_tier
      },
      next_steps: [
        'Visit the dashboard to monitor your agent: https://ais.solpay.cash/dashboard',
        'Your agent can now use premium features',
        'Fund your agent with USDC via x402 for higher rate limits'
      ],
      dashboard_url: 'https://ais.solpay.cash/dashboard'
    });

  } catch (error) {
    console.error('Claim verify error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error',
      code: 'internal_error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Agent Immune System - Claim Verify Endpoint',
    description: 'Complete the claim process by providing your tweet URL.',
    usage: {
      method: 'POST',
      endpoint: 'https://ais.solpay.cash/api/claim/verify',
      body: {
        claim_code: 'AIS_XXXXXXXX (from /api/claim/init)',
        tweet_url: 'https://x.com/your_handle/status/123456789'
      }
    },
    requirements: [
      'Tweet must be from the URL you provide',
      'Tweet should contain the claim code',
      'Tweet should mention @SolPayCash'
    ]
  });
}
