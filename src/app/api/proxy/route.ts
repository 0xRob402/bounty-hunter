import { NextRequest, NextResponse } from 'next/server';
import { getAgentByApiKey, updateAgent, logEvent, addThreatSignature, getPoliciesForAgent } from '@/lib/db';
import { scanForThreats, scanAndRedactSecrets, generateSignatureHash, checkRateLimit } from '@/lib/threats';

export const dynamic = 'force-dynamic';

// Tier limits
const TIER_LIMITS = {
  free: { requestsPerHour: 1000, requestsPerDay: 5000 },
  pro: { requestsPerHour: 10000, requestsPerDay: 100000 },
  enterprise: { requestsPerHour: 100000, requestsPerDay: 1000000 },
};

// POST /api/proxy - Main proxy endpoint for tool calls
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing API key', code: 'unauthorized' },
        { status: 401 }
      );
    }

    // Lookup agent
    const agentResult = await getAgentByApiKey(apiKey);
    if (!agentResult.ok || !agentResult.data) {
      return NextResponse.json(
        { ok: false, error: 'Invalid API key', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const agent = agentResult.data;

    // Check if quarantined
    if (agent.status === 'quarantined') {
      return NextResponse.json(
        { ok: false, error: 'Agent is quarantined. Contact support.', code: 'quarantined' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tool, action, data, target_url } = body;

    if (!tool && !target_url) {
      return NextResponse.json(
        { ok: false, error: 'Missing tool or target_url', code: 'bad_request' },
        { status: 400 }
      );
    }

    // Rate limit check
    const tier = agent.subscription_tier as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const rateLimitResult = checkRateLimit(agent.id!, limits.requestsPerHour);

    if (!rateLimitResult.allowed) {
      await logEvent({
        agent_id: agent.id,
        event_type: 'rate_limited',
        tool_name: tool || target_url,
        decision: 'block',
        threat_detected: false,
        latency_ms: Date.now() - startTime,
      });

      return NextResponse.json(
        { 
          ok: false, 
          error: 'Rate limit exceeded', 
          code: 'rate_limited',
          limit: rateLimitResult.limit,
          reset_at: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // Scan input data for threats
    const inputStr = JSON.stringify(data || {});
    const threatScan = scanForThreats(inputStr);

    if (!threatScan.safe) {
      const threat = threatScan.threats[0];
      
      // Log the threat
      await logEvent({
        agent_id: agent.id,
        event_type: 'threat_blocked',
        tool_name: tool || target_url,
        request_data: inputStr.substring(0, 500),
        decision: 'block',
        threat_detected: true,
        threat_type: threat.type,
        latency_ms: Date.now() - startTime,
      });

      // Add to threat feed
      const signatureHash = generateSignatureHash(threat);
      await addThreatSignature({
        signature_hash: signatureHash,
        threat_type: threat.type,
        pattern: threat.pattern.substring(0, 200),
        description: threat.description,
        severity: threat.severity,
        source_agent_id: agent.id,
      });

      // Update agent stats
      await updateAgent(agent.id!, {
        threats_blocked: (agent.threats_blocked || 0) + 1,
      });

      return NextResponse.json(
        {
          ok: false,
          error: 'Threat detected and blocked',
          code: 'threat_blocked',
          threat: {
            type: threat.type,
            severity: threat.severity,
            description: threat.description,
          },
        },
        { status: 400 }
      );
    }

    // Scan for secrets and redact
    const secretScan = scanAndRedactSecrets(inputStr);
    let processedData = data;
    
    if (secretScan.secretsFound.length > 0) {
      // Log secret detection
      await logEvent({
        agent_id: agent.id,
        event_type: 'key_redacted',
        tool_name: tool || target_url,
        decision: 'redact',
        threat_detected: true,
        threat_type: 'secret_leak',
        latency_ms: Date.now() - startTime,
      });

      // Parse redacted data back
      try {
        processedData = JSON.parse(secretScan.redacted);
      } catch {
        processedData = secretScan.redacted;
      }

      // Update stats
      await updateAgent(agent.id!, {
        threats_blocked: (agent.threats_blocked || 0) + secretScan.secretsFound.length,
      });
    }

    // If target_url provided, proxy the request
    let proxyResponse = null;
    if (target_url) {
      try {
        const proxyRes = await fetch(target_url, {
          method: body.method || 'GET',
          headers: body.headers || {},
          body: body.method !== 'GET' ? JSON.stringify(processedData) : undefined,
        });
        proxyResponse = await proxyRes.json().catch(() => proxyRes.text());
        
        // Scan response for injections
        const responseScan = scanForThreats(JSON.stringify(proxyResponse));
        if (!responseScan.safe) {
          await logEvent({
            agent_id: agent.id,
            event_type: 'threat_blocked',
            tool_name: target_url,
            decision: 'block',
            threat_detected: true,
            threat_type: responseScan.threats[0].type,
            latency_ms: Date.now() - startTime,
          });

          return NextResponse.json({
            ok: false,
            error: 'Response contained potential threat',
            code: 'response_threat',
            threat: responseScan.threats[0],
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({
          ok: false,
          error: 'Proxy request failed',
          code: 'proxy_error',
        }, { status: 502 });
      }
    }

    // Log successful event
    await logEvent({
      agent_id: agent.id,
      event_type: 'tool_call',
      tool_name: tool || target_url,
      decision: 'allow',
      threat_detected: false,
      latency_ms: Date.now() - startTime,
    });

    // Update request counts
    await updateAgent(agent.id!, {
      requests_today: (agent.requests_today || 0) + 1,
      requests_total: (agent.requests_total || 0) + 1,
    });

    return NextResponse.json({
      ok: true,
      decision: 'allow',
      processed_data: processedData,
      proxy_response: proxyResponse,
      secrets_redacted: secretScan.secretsFound.length,
      latency_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal error', code: 'internal_error' },
      { status: 500 }
    );
  }
}
