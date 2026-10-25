import { NextRequest, NextResponse } from 'next/server';
import { getJobs, parseJobsQuery } from '@/lib/jobs/aggregate';
import { clientKey, createRateLimiter } from '@/lib/jobs/rateLimit';

// 60 requests per minute per client per server instance (see rateLimit.ts for limits of this approach).
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const decision = limiter(clientKey(request.headers));
  if (!decision.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds), 'Cache-Control': 'no-store' } },
    );
  }

  const parsed = parseJobsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const body = await getJobs(parsed.query);
    return NextResponse.json(body, {
      headers: {
        // Let the CDN absorb repeated identical queries.
        'Cache-Control': body.degraded
          ? 'public, s-maxage=60, stale-while-revalidate=120'
          : 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[jobs] unexpected failure', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Job listings are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
