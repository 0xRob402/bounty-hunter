import { NextRequest, NextResponse } from 'next/server';
import { getThreatFeed, getRecentThreats } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/threats - Get threat feed
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type');

  const result = await getThreatFeed(Math.min(limit, 200));

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch threat feed' },
      { status: 500 }
    );
  }

  let threats = result.data || [];

  // Filter by type if specified
  if (type) {
    threats = threats.filter(t => t.threat_type === type);
  }

  return NextResponse.json({
    ok: true,
    count: threats.length,
    threats: threats.map(t => ({
      id: t.id,
      signature: t.signature_hash,
      type: t.threat_type,
      severity: t.severity,
      description: t.description,
      times_blocked: t.times_blocked,
      first_seen: t.created_at,
    })),
  });
}
