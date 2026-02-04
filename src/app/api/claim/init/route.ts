import { NextRequest, NextResponse } from 'next/server';
import { getAgentByName, updateAgent } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_name } = body;

    if (!agent_name) {
      return NextResponse.json({
        ok: false,
        error: 'agent_name is required',
        code: 'missing_agent_name'
      }, { status: 400 });
    }

    // Check if agent exists
    const agentResult = await getAgentByName(agent_name);
    if (!agentResult.ok || !agentResult.data) {
      return NextResponse.json({
        ok: false,
        error: 'Agent not found. The agent must register first via /api/register.',
        code: 'agent_not_found'
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

    // Generate claim code
    const claimCode = 'AIS_' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Update agent with claim code
    await updateAgent(agent.id!, {
      claim_code: claimCode,
      claim_status: 'pending'
    });

    // Generate the tweet text
    const tweetText = `Claiming my agent "${agent_name}" on Agent Immune System 🛡️

Verify: ${claimCode}

@SolPayCash #x402 #AIAgents`;

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return NextResponse.json({
      ok: true,
      agent_name: agent.agent_name,
      claim_code: claimCode,
      tweet_text: tweetText,
      tweet_url: tweetUrl,
      instructions: [
        '1. Post the tweet above (click the link or copy/paste)',
        '2. Copy your tweet URL after posting',
        '3. Come back and verify with /api/claim/verify'
      ],
      verify_endpoint: 'POST /api/claim/verify',
      verify_body: {
        claim_code: claimCode,
        tweet_url: 'https://x.com/your_handle/status/123...'
      }
    });

  } catch (error) {
    console.error('Claim init error:', error);
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
    message: 'Agent Immune System - Claim Init Endpoint',
    description: 'Start the process to claim ownership of your agent. This creates a viral verification tweet.',
    usage: {
      method: 'POST',
      endpoint: 'https://ais.solpay.cash/api/claim/init',
      body: {
        agent_name: 'your-agent-name (required)'
      }
    },
    flow: [
      '1. POST /api/claim/init with your agent_name',
      '2. Post the generated tweet to Twitter/X',
      '3. POST /api/claim/verify with claim_code and tweet_url',
      '4. Your agent is now verified as yours!'
    ],
    why: 'Claiming your agent proves ownership and unlocks premium features. The tweet helps spread the word about AI agent security.'
  });
}
