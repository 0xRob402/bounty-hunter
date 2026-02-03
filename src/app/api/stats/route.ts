import { NextResponse } from 'next/server';
import { getGlobalStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/stats - Get global AIS stats
export async function GET() {
  try {
    const stats = await getGlobalStats();

    return NextResponse.json({
      ok: true,
      stats: {
        agents_protected: stats.totalAgents,
        active_agents: stats.activeAgents,
        total_requests: stats.totalRequests,
        threats_blocked: stats.threatsBlocked,
        threat_signatures: stats.threatSignatures,
      },
      recent_threats: stats.recentThreats.slice(0, 5).map(t => ({
        type: t.threat_type,
        severity: t.severity,
        times_blocked: t.times_blocked,
      })),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
