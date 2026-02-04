import { NextRequest, NextResponse } from 'next/server';
import { getAgentsByTwitter } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/operator?twitter=handle - Get agents claimed by a Twitter handle
export async function GET(request: NextRequest) {
  const twitterHandle = request.nextUrl.searchParams.get('twitter');

  if (!twitterHandle) {
    return NextResponse.json({
      ok: false,
      error: 'Twitter handle required. Use ?twitter=your_handle',
      code: 'missing_twitter'
    }, { status: 400 });
  }

  // Normalize handle (remove @ if present)
  const handle = twitterHandle.replace(/^@/, '').toLowerCase();

  try {
    const result = await getAgentsByTwitter(handle);
    
    if (!result.ok || !result.data || result.data.length === 0) {
      // Also try with original case
      const result2 = await getAgentsByTwitter(twitterHandle.replace(/^@/, ''));
      if (!result2.ok || !result2.data || result2.data.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'No agents found claimed by this Twitter handle',
          code: 'no_agents_found',
          hint: 'Make sure you have claimed an agent at /claim'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        ok: true,
        twitter_handle: twitterHandle.replace(/^@/, ''),
        agents: result2.data.map(agent => ({
          id: agent.id,
          name: agent.agent_name,
          tier: agent.subscription_tier,
          status: agent.status,
          requests_today: agent.requests_today || 0,
          requests_total: agent.requests_total || 0,
          threats_blocked: agent.threats_blocked || 0,
          credits_usdc: agent.credits_usdc || 0,
          price_per_request: agent.price_per_request || 0.001,
          claim_tweet_url: agent.claim_tweet_url,
          claimed_at: agent.claimed_at,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      twitter_handle: handle,
      agents: result.data.map(agent => ({
        id: agent.id,
        name: agent.agent_name,
        tier: agent.subscription_tier,
        status: agent.status,
        requests_today: agent.requests_today || 0,
        requests_total: agent.requests_total || 0,
        threats_blocked: agent.threats_blocked || 0,
        credits_usdc: agent.credits_usdc || 0,
        price_per_request: agent.price_per_request || 0.001,
        claim_tweet_url: agent.claim_tweet_url,
        claimed_at: agent.claimed_at,
      })),
    });
  } catch (error) {
    console.error('Operator lookup error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to lookup agents',
      code: 'internal_error'
    }, { status: 500 });
  }
}
