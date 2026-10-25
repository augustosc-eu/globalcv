import { NextResponse } from 'next/server';

// Liveness probe for uptime monitors. Intentionally does not call upstream
// job providers (their health is reported per request by /api/jobs `sources`).
export function GET() {
  return NextResponse.json(
    { status: 'ok', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
